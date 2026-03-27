import request from 'supertest';
import app from '../../src/app';
import { setupTestDb, teardownTestDb, testPrisma } from './helpers';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

let token: string;
let tableId: string;
let menuItemId: string;
let orderId: string;

async function getToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@admin.com', password: 'testpass123' });
  return res.body.data.token as string;
}

describe('Payment API', () => {
  beforeAll(async () => {
    process.env['XENDIT_SECRET_KEY'] = 'xnd_test_key';
    process.env['DEFAULT_PAYMENT_GATEWAY'] = 'XENDIT';

    await setupTestDb();
    token = await getToken();

    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${token}`)
      .send({ number: 10, name: 'Payment Test Table', capacity: 4 });
    tableId = tableRes.body.data.id as string;

    const catRes = await request(app)
      .post('/api/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Payment Test Category' });

    const itemRes = await request(app)
      .post('/api/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Payment Test Item', price: 30000, categoryId: catRes.body.data.id as string });
    menuItemId = itemRes.body.data.id as string;

    const orderRes = await request(app)
      .post('/api/orders')
      .send({ tableId, items: [{ menuItemId, quantity: 1 }] });
    orderId = orderRes.body.data.id as string;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/orders/:orderId', () => {
    it('creates QRIS payment via Xendit', async () => {
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: { id: 'qr_test_123', qr_string: 'test-qr-string', status: 'ACTIVE' },
      });

      const res = await request(app)
        .post(`/api/payments/orders/${orderId}`)
        .send({ method: 'QRIS', gateway: 'XENDIT' });

      expect(res.status).toBe(201);
      expect(res.body.data.method).toBe('QRIS');
      expect(res.body.data.gateway).toBe('XENDIT');
      expect(res.body.data.qrString).toBe('test-qr-string');
      expect(res.body.data.status).toBe('PENDING');
    });

    it('returns existing payment if already pending', async () => {
      // Second call should return the existing payment
      const res = await request(app)
        .post(`/api/payments/orders/${orderId}`)
        .send({ method: 'QRIS' });

      expect(res.status).toBe(200); // Returns 200, not 201
    });

    it('rejects payment for non-existent order', async () => {
      const res = await request(app)
        .post('/api/payments/orders/00000000-0000-0000-0000-000000000000')
        .send({ method: 'QRIS' });

      expect(res.status).toBe(404);
    });

    it('validates method field', async () => {
      const res = await request(app)
        .post(`/api/payments/orders/${orderId}`)
        .send({ method: 'INVALID' });

      expect(res.status).toBe(400);
    });

    it('requires bankCode for VIRTUAL_ACCOUNT', async () => {
      // Create a fresh order for this test
      const freshOrderRes = await request(app)
        .post('/api/orders')
        .send({ tableId, items: [{ menuItemId, quantity: 1 }] });

      const res = await request(app)
        .post(`/api/payments/orders/${freshOrderRes.body.data.id as string}`)
        .send({ method: 'VIRTUAL_ACCOUNT' }); // missing bankCode

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/payments/orders/:orderId', () => {
    it('retrieves payment for order', async () => {
      const res = await request(app).get(`/api/payments/orders/${orderId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.orderId).toBe(orderId);
    });

    it('returns 404 for order with no payment', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .send({ tableId, items: [{ menuItemId, quantity: 1 }] });

      const res = await request(app).get(
        `/api/payments/orders/${orderRes.body.data.id as string}`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/payments/orders/:orderId/status', () => {
    it('returns payment status from gateway', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { status: 'ACTIVE' },
      });

      const res = await request(app).get(`/api/payments/orders/${orderId}/status`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBeDefined();
    });

    it('handles gateway poll failure gracefully', async () => {
      mockedAxios.get = jest.fn().mockRejectedValue(new Error('Gateway timeout'));

      const res = await request(app).get(`/api/payments/orders/${orderId}/status`);
      // Should still return 200 with cached status
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/payments/webhooks/xendit', () => {
    it('handles Xendit QRIS payment webhook', async () => {
      // First get the payment's externalId
      const paymentRes = await request(app).get(`/api/payments/orders/${orderId}`);
      const externalId = paymentRes.body.data.externalId as string;

      const res = await request(app)
        .post('/api/payments/webhooks/xendit')
        .set('x-callback-token', '') // no token configured in test
        .send({
          event: 'qr.payment',
          data: {
            reference_id: externalId,
            status: 'COMPLETED',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      // Verify order status updated
      const orderRes = await request(app).get(`/api/orders/${orderId}`);
      expect(orderRes.body.data.status).toBe('PAID');
    });
  });
});

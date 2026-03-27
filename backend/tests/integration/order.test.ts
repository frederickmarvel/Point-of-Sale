import request from 'supertest';
import app from '../../src/app';
import { setupTestDb, teardownTestDb, testPrisma } from './helpers';

let token: string;
let tableId: string;
let categoryId: string;
let menuItemId: string;

async function getToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@admin.com', password: 'testpass123' });
  return res.body.data.token as string;
}

describe('Order & Table API', () => {
  beforeAll(async () => {
    await setupTestDb();
    token = await getToken();

    // Create a test table
    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${token}`)
      .send({ number: 1, name: 'Table 1', capacity: 4 });
    tableId = tableRes.body.data.id as string;

    // Create a test category and menu item
    const catRes = await request(app)
      .post('/api/menu/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Category' });
    categoryId = catRes.body.data.id as string;

    const itemRes = await request(app)
      .post('/api/menu/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Item', price: 25000, categoryId });
    menuItemId = itemRes.body.data.id as string;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // ── Tables ────────────────────────────────────────────────────────────────
  describe('Tables', () => {
    it('GET /api/tables - lists tables', async () => {
      const res = await request(app)
        .get('/api/tables')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/tables/:id - gets table', async () => {
      const res = await request(app)
        .get(`/api/tables/${tableId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(tableId);
      expect(res.body.data.qrCode).toBeTruthy(); // QR code generated on create
    });

    it('GET /api/tables/:id/public - public table endpoint', async () => {
      const res = await request(app).get(`/api/tables/${tableId}/public`);
      expect(res.status).toBe(200);
      expect(res.body.data.number).toBe(1);
    });

    it('POST /api/tables - rejects duplicate number', async () => {
      const res = await request(app)
        .post('/api/tables')
        .set('Authorization', `Bearer ${token}`)
        .send({ number: 1, name: 'Duplicate' });

      expect(res.status).toBe(409);
    });

    it('POST /api/tables/:id/qr - regenerates QR code', async () => {
      const res = await request(app)
        .post(`/api/tables/${tableId}/qr`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.qrCode).toBeTruthy();
      expect(res.body.data.qrUrl).toBeTruthy();
    });

    it('PATCH /api/tables/:id - updates table', async () => {
      const res = await request(app)
        .patch(`/api/tables/${tableId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ capacity: 6 });

      expect(res.status).toBe(200);
      expect(res.body.data.capacity).toBe(6);
    });
  });

  // ── Orders ────────────────────────────────────────────────────────────────
  describe('Orders', () => {
    let orderId: string;

    it('POST /api/orders - places an order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          tableId,
          customerName: 'John Doe',
          customerNote: 'No spicy',
          items: [{ menuItemId, quantity: 2, notes: 'Extra sauce' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.totalAmount).toBe(50000); // 25000 * 2
      expect(res.body.data.status).toBe('PENDING');
      orderId = res.body.data.id as string;
    });

    it('POST /api/orders - rejects inactive table', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          tableId: '00000000-0000-0000-0000-000000000000',
          items: [{ menuItemId, quantity: 1 }],
        });

      expect(res.status).toBe(404);
    });

    it('POST /api/orders - validates at least 1 item', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ tableId, items: [] });

      expect(res.status).toBe(400);
    });

    it('POST /api/orders - rejects unavailable menu item', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          tableId,
          items: [{ menuItemId: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
        });

      expect(res.status).toBe(400);
    });

    it('GET /api/orders/:id - returns order (public)', async () => {
      const res = await request(app).get(`/api/orders/${orderId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderId);
      expect(res.body.data.orderItems.length).toBe(1);
    });

    it('GET /api/orders - admin lists orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/orders - filters by status', async () => {
      const res = await request(app)
        .get('/api/orders?status=PENDING')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((o: { status: string }) => o.status === 'PENDING')).toBe(true);
    });

    it('PATCH /api/orders/:id/status - transitions PENDING -> CANCELLED', async () => {
      // Create a separate order to cancel
      const orderRes = await request(app)
        .post('/api/orders')
        .send({ tableId, items: [{ menuItemId, quantity: 1 }] });

      const cancelRes = await request(app)
        .patch(`/api/orders/${orderRes.body.data.id as string}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CANCELLED' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    it('PATCH /api/orders/:id/status - rejects invalid transition', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'COMPLETED' }); // Cannot go from PENDING to COMPLETED

      expect(res.status).toBe(400);
    });

    it('GET /api/orders/stats/today - returns stats', async () => {
      const res = await request(app)
        .get('/api/orders/stats/today')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.today).toBeDefined();
      expect(res.body.data.today.totalOrders).toBeGreaterThanOrEqual(0);
    });
  });
});

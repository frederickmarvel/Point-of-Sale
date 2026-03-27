import { XenditGateway, DurianpayGateway, getPaymentGateway } from '../../src/services/payment.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['XENDIT_SECRET_KEY'] = 'xnd_test_key';
    process.env['DURIANPAY_SECRET_KEY'] = 'dp_test_key';
    process.env['DEFAULT_PAYMENT_GATEWAY'] = 'XENDIT';
  });

  describe('getPaymentGateway', () => {
    it('returns XenditGateway by default', () => {
      const gw = getPaymentGateway();
      expect(gw).toBeInstanceOf(XenditGateway);
    });

    it('returns XenditGateway for XENDIT', () => {
      const gw = getPaymentGateway('XENDIT');
      expect(gw).toBeInstanceOf(XenditGateway);
    });

    it('returns DurianpayGateway for DURIANPAY', () => {
      const gw = getPaymentGateway('DURIANPAY');
      expect(gw).toBeInstanceOf(DurianpayGateway);
    });

    it('throws if Xendit key not configured', () => {
      delete process.env['XENDIT_SECRET_KEY'];
      expect(() => getPaymentGateway('XENDIT')).toThrow('XENDIT_SECRET_KEY');
    });

    it('throws if Durianpay key not configured', () => {
      delete process.env['DURIANPAY_SECRET_KEY'];
      expect(() => getPaymentGateway('DURIANPAY')).toThrow('DURIANPAY_SECRET_KEY');
    });
  });

  describe('XenditGateway', () => {
    let gateway: XenditGateway;

    beforeEach(() => {
      gateway = new XenditGateway('xnd_test_key');
    });

    it('createQrisPayment returns expected shape on success', async () => {
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: { id: 'qr_123', qr_string: 'some-qr-string', status: 'ACTIVE' },
      });

      const result = await gateway.createQrisPayment({
        orderId: 'order-uuid-123',
        amount: 50000,
        customerName: 'Test Customer',
        description: 'Order #1',
      });

      expect(result.qrString).toBe('some-qr-string');
      expect(result.gatewayPaymentId).toBe('qr_123');
      expect(result.externalId).toMatch(/^pos-order-uuid-123-/);
      expect(result.expiredAt).toBeInstanceOf(Date);
    });

    it('createQrisPayment throws on gateway error', async () => {
      const axiosError = Object.assign(new Error('Network error'), {
        response: { data: { error_code: 'API_ERROR' } },
      });
      mockedAxios.post = jest.fn().mockRejectedValue(axiosError);

      await expect(
        gateway.createQrisPayment({
          orderId: 'order-uuid-123',
          amount: 50000,
          description: 'Order #1',
        }),
      ).rejects.toThrow('Xendit QRIS creation failed');
    });

    it('getPaymentStatus returns PAID for COMPLETED status', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { status: 'COMPLETED', payments: [{ created: new Date().toISOString() }] },
      });

      const result = await gateway.getPaymentStatus('ext-id-123');
      expect(result.status).toBe('PAID');
    });

    it('getPaymentStatus returns PENDING for ACTIVE status', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { status: 'ACTIVE' },
      });

      const result = await gateway.getPaymentStatus('ext-id-123');
      expect(result.status).toBe('PENDING');
    });

    it('getPaymentStatus returns EXPIRED for EXPIRED status', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { status: 'EXPIRED' },
      });

      const result = await gateway.getPaymentStatus('ext-id-123');
      expect(result.status).toBe('EXPIRED');
    });
  });

  describe('DurianpayGateway', () => {
    let gateway: DurianpayGateway;

    beforeEach(() => {
      gateway = new DurianpayGateway('dp_test_key');
      process.env['DURIANPAY_SUCCESS_URL'] = 'http://localhost:5173/success';
    });

    it('createQrisPayment returns expected shape on success', async () => {
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: 'dp_order_123',
            checkout_url: 'https://checkout.durianpay.id/pay/123',
            qr_code: 'dp-qr-string',
          },
        },
      });

      const result = await gateway.createQrisPayment({
        orderId: 'order-uuid-456',
        amount: 75000,
        description: 'Order #2',
      });

      expect(result.gatewayPaymentId).toBe('dp_order_123');
      expect(result.paymentUrl).toBe('https://checkout.durianpay.id/pay/123');
      expect(result.qrString).toBe('dp-qr-string');
    });

    it('getPaymentStatus returns PAID for completed', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { data: { status: 'completed' } },
      });

      const result = await gateway.getPaymentStatus('dp-ext-id');
      expect(result.status).toBe('PAID');
    });
  });
});

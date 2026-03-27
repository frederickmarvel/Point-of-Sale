import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.util';

export interface PaymentCreationResult {
  externalId: string;
  gatewayPaymentId?: string;
  paymentUrl?: string;
  qrString?: string;
  expiredAt?: Date;
  rawResponse: string;
}

export interface PaymentGateway {
  createQrisPayment(params: {
    orderId: string;
    amount: number;
    customerName?: string;
    description: string;
  }): Promise<PaymentCreationResult>;

  createVirtualAccountPayment(params: {
    orderId: string;
    amount: number;
    customerName?: string;
    customerEmail?: string;
    description: string;
    bankCode: string;
  }): Promise<PaymentCreationResult>;

  getPaymentStatus(externalId: string): Promise<{
    status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
    paidAt?: Date;
    rawResponse: string;
  }>;
}

// ─── Xendit Gateway ──────────────────────────────────────────────────────────

export class XenditGateway implements PaymentGateway {
  private readonly baseUrl = 'https://api.xendit.co';
  private readonly secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`;
  }

  async createQrisPayment(params: {
    orderId: string;
    amount: number;
    customerName?: string;
    description: string;
  }): Promise<PaymentCreationResult> {
    const externalId = `pos-${params.orderId}-${randomUUID().slice(0, 8)}`;
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    try {
      const response = await axios.post(
        `${this.baseUrl}/qr_codes`,
        {
          reference_id: externalId,
          type: 'DYNAMIC',
          currency: 'IDR',
          amount: Math.round(params.amount),
          expires_at: expiredAt.toISOString(),
          metadata: { orderId: params.orderId, description: params.description },
        },
        { headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' } },
      );

      const data = response.data as {
        id?: string;
        qr_string?: string;
      };

      return {
        externalId,
        gatewayPaymentId: data.id,
        qrString: data.qr_string,
        expiredAt,
        rawResponse: JSON.stringify(response.data),
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      logger.error('Xendit QRIS creation failed', { error: axiosErr.response?.data ?? axiosErr.message });
      throw new Error(`Xendit QRIS creation failed: ${axiosErr.message}`);
    }
  }

  async createVirtualAccountPayment(params: {
    orderId: string;
    amount: number;
    customerName?: string;
    customerEmail?: string;
    description: string;
    bankCode: string;
  }): Promise<PaymentCreationResult> {
    const externalId = `pos-${params.orderId}-${randomUUID().slice(0, 8)}`;
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
      const response = await axios.post(
        `${this.baseUrl}/callback_virtual_accounts`,
        {
          external_id: externalId,
          bank_code: params.bankCode,
          name: params.customerName ?? 'POS Customer',
          expected_amount: Math.round(params.amount),
          expiration_date: expiredAt.toISOString(),
          is_single_use: true,
          is_closed: true,
        },
        { headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' } },
      );

      const data = response.data as {
        id?: string;
        account_number?: string;
      };

      return {
        externalId,
        gatewayPaymentId: data.id,
        paymentUrl: undefined,
        expiredAt,
        rawResponse: JSON.stringify(response.data),
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      logger.error('Xendit VA creation failed', { error: axiosErr.response?.data ?? axiosErr.message });
      throw new Error(`Xendit VA creation failed: ${axiosErr.message}`);
    }
  }

  async getPaymentStatus(externalId: string): Promise<{
    status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
    paidAt?: Date;
    rawResponse: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/qr_codes/${externalId}`, {
        headers: { Authorization: this.authHeader },
      });
      const data = response.data as { status?: string; payments?: Array<{ created?: string }> };
      const xenditStatus = data.status?.toUpperCase() ?? '';
      let status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' = 'PENDING';
      if (xenditStatus === 'ACTIVE') status = 'PENDING';
      else if (xenditStatus === 'COMPLETED') status = 'PAID';
      else if (xenditStatus === 'EXPIRED') status = 'EXPIRED';

      return {
        status,
        paidAt: status === 'PAID' ? new Date() : undefined,
        rawResponse: JSON.stringify(response.data),
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      throw new Error(`Failed to get Xendit payment status: ${axiosErr.message}`);
    }
  }
}

// ─── Durianpay Gateway ───────────────────────────────────────────────────────

export class DurianpayGateway implements PaymentGateway {
  private readonly baseUrl = 'https://api.durianpay.id/v1';
  private readonly secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`;
  }

  async createQrisPayment(params: {
    orderId: string;
    amount: number;
    customerName?: string;
    description: string;
  }): Promise<PaymentCreationResult> {
    const externalId = `pos-${params.orderId}-${randomUUID().slice(0, 8)}`;
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        {
          amount: Math.round(params.amount).toString(),
          currency: 'IDR',
          payment_option: 'qris',
          description: params.description,
          order_ref_id: externalId,
          customer: {
            customer_ref_id: externalId,
            given_names: params.customerName ?? 'POS Customer',
          },
          items: [
            {
              name: params.description,
              qty: 1,
              price: Math.round(params.amount).toString(),
              logo: '',
            },
          ],
          callback_url: process.env['DURIANPAY_SUCCESS_URL'] ?? '',
          return_url: process.env['DURIANPAY_SUCCESS_URL'] ?? '',
          expiry_date: expiredAt.toISOString(),
        },
        { headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' } },
      );

      const data = response.data as { data?: { id?: string; checkout_url?: string; qr_code?: string } };
      const orderData = data.data ?? {};

      return {
        externalId,
        gatewayPaymentId: orderData.id,
        paymentUrl: orderData.checkout_url,
        qrString: orderData.qr_code,
        expiredAt,
        rawResponse: JSON.stringify(response.data),
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      logger.error('Durianpay QRIS creation failed', { error: axiosErr.response?.data ?? axiosErr.message });
      throw new Error(`Durianpay QRIS creation failed: ${axiosErr.message}`);
    }
  }

  async createVirtualAccountPayment(params: {
    orderId: string;
    amount: number;
    customerName?: string;
    customerEmail?: string;
    description: string;
    bankCode: string;
  }): Promise<PaymentCreationResult> {
    const externalId = `pos-${params.orderId}-${randomUUID().slice(0, 8)}`;
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        {
          amount: Math.round(params.amount).toString(),
          currency: 'IDR',
          payment_option: 'virtual_account',
          description: params.description,
          order_ref_id: externalId,
          customer: {
            customer_ref_id: externalId,
            given_names: params.customerName ?? 'POS Customer',
            email: params.customerEmail ?? 'customer@pos.com',
          },
          items: [
            {
              name: params.description,
              qty: 1,
              price: Math.round(params.amount).toString(),
              logo: '',
            },
          ],
          return_url: process.env['DURIANPAY_SUCCESS_URL'] ?? '',
          expiry_date: expiredAt.toISOString(),
        },
        { headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' } },
      );

      const data = response.data as { data?: { id?: string; checkout_url?: string } };
      const orderData = data.data ?? {};

      return {
        externalId,
        gatewayPaymentId: orderData.id,
        paymentUrl: orderData.checkout_url,
        expiredAt,
        rawResponse: JSON.stringify(response.data),
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      logger.error('Durianpay VA creation failed', { error: axiosErr.response?.data ?? axiosErr.message });
      throw new Error(`Durianpay VA creation failed: ${axiosErr.message}`);
    }
  }

  async getPaymentStatus(externalId: string): Promise<{
    status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
    paidAt?: Date;
    rawResponse: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/orders/${externalId}/status`, {
        headers: { Authorization: this.authHeader },
      });
      const data = response.data as { data?: { status?: string } };
      const dpStatus = data.data?.status?.toLowerCase() ?? '';
      let status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' = 'PENDING';
      if (['completed', 'paid', 'settlement'].includes(dpStatus)) status = 'PAID';
      else if (['failed', 'cancelled'].includes(dpStatus)) status = 'FAILED';
      else if (dpStatus === 'expired') status = 'EXPIRED';

      return {
        status,
        paidAt: status === 'PAID' ? new Date() : undefined,
        rawResponse: JSON.stringify(response.data),
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      throw new Error(`Failed to get Durianpay payment status: ${axiosErr.message}`);
    }
  }
}

// ─── Gateway Factory ─────────────────────────────────────────────────────────

export function getPaymentGateway(gateway?: string): PaymentGateway {
  const gatewayName = (gateway ?? process.env['DEFAULT_PAYMENT_GATEWAY'] ?? 'XENDIT').toUpperCase();

  if (gatewayName === 'DURIANPAY') {
    const key = process.env['DURIANPAY_SECRET_KEY'];
    if (!key) throw new Error('DURIANPAY_SECRET_KEY is not configured');
    return new DurianpayGateway(key);
  }

  // Default: Xendit
  const key = process.env['XENDIT_SECRET_KEY'];
  if (!key) throw new Error('XENDIT_SECRET_KEY is not configured');
  return new XenditGateway(key);
}

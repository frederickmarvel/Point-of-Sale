import api from '@/utils/api';
import type { ApiResponse, Payment, CreatePaymentRequest } from '@/types';

export const paymentService = {
  async createPayment(orderId: string, data: CreatePaymentRequest): Promise<Payment> {
    const response = await api.post<ApiResponse<Payment>>(
      `/api/payments/orders/${orderId}`,
      data,
    );
    return response.data.data!;
  },

  async getPayment(orderId: string): Promise<Payment> {
    const response = await api.get<ApiResponse<Payment>>(`/api/payments/orders/${orderId}`);
    return response.data.data!;
  },

  async checkPaymentStatus(orderId: string): Promise<Payment> {
    const response = await api.get<ApiResponse<Payment>>(
      `/api/payments/orders/${orderId}/status`,
    );
    return response.data.data!;
  },
};

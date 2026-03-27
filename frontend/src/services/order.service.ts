import api from '@/utils/api';
import type {
  ApiResponse,
  Order,
  PlaceOrderRequest,
  UpdateOrderStatusRequest,
  OrdersFilter,
  TodayStats,
  Pagination,
} from '@/types';

export interface OrdersResponse {
  orders: Order[];
  pagination: Pagination;
}

export const orderService = {
  async placeOrder(data: PlaceOrderRequest): Promise<Order> {
    const response = await api.post<ApiResponse<Order>>('/api/orders', data);
    return response.data.data!;
  },

  async getOrders(filter?: OrdersFilter): Promise<OrdersResponse> {
    const params = new URLSearchParams();
    if (filter?.status) params.set('status', filter.status);
    if (filter?.tableId) params.set('tableId', filter.tableId);
    if (filter?.date) params.set('date', filter.date);
    if (filter?.page) params.set('page', String(filter.page));
    if (filter?.limit) params.set('limit', String(filter.limit));

    const response = await api.get<ApiResponse<Order[]>>(`/api/orders?${params.toString()}`);
    return {
      orders: response.data.data ?? [],
      pagination: response.data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getOrder(id: string): Promise<Order> {
    const response = await api.get<ApiResponse<Order>>(`/api/orders/${id}`);
    return response.data.data!;
  },

  async updateOrderStatus(id: string, data: UpdateOrderStatusRequest): Promise<Order> {
    const response = await api.patch<ApiResponse<Order>>(`/api/orders/${id}/status`, data);
    return response.data.data!;
  },

  async getTodayStats(): Promise<TodayStats> {
    const response = await api.get<ApiResponse<TodayStats>>('/api/orders/stats/today');
    return response.data.data!;
  },
};

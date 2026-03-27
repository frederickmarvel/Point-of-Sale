import api from '@/utils/api';
import type { ApiResponse, Table, CreateTableRequest, UpdateTableRequest } from '@/types';

export const tableService = {
  async getTables(): Promise<Table[]> {
    const response = await api.get<ApiResponse<Table[]>>('/api/tables');
    return response.data.data ?? [];
  },

  async getPublicTable(id: string): Promise<Table> {
    const response = await api.get<ApiResponse<Table>>(`/api/tables/${id}/public`);
    return response.data.data!;
  },

  async createTable(data: CreateTableRequest): Promise<Table> {
    const response = await api.post<ApiResponse<Table>>('/api/tables', data);
    return response.data.data!;
  },

  async updateTable(id: string, data: UpdateTableRequest): Promise<Table> {
    const response = await api.patch<ApiResponse<Table>>(`/api/tables/${id}`, data);
    return response.data.data!;
  },

  async deleteTable(id: string): Promise<void> {
    await api.delete(`/api/tables/${id}`);
  },

  async regenerateQrCode(id: string): Promise<Table> {
    const response = await api.post<ApiResponse<Table>>(`/api/tables/${id}/qr`);
    return response.data.data!;
  },
};

import api from '@/utils/api';
import type { ApiResponse, LoginRequest, LoginResponse, Admin } from '@/types';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/api/auth/login', data);
    return response.data.data!;
  },

  async getProfile(): Promise<Admin> {
    const response = await api.get<ApiResponse<Admin>>('/api/auth/profile');
    return response.data.data!;
  },
};

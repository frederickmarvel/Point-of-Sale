import api from '@/utils/api';
import type {
  ApiResponse,
  Category,
  MenuItem,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
} from '@/types';

export const menuService = {
  // ─── Public ─────────────────────────────────────────────────────────────────

  async getPublicMenu(): Promise<Category[]> {
    const response = await api.get<ApiResponse<Category[]>>('/api/menu/public');
    return response.data.data ?? [];
  },

  // ─── Categories ──────────────────────────────────────────────────────────────

  async getCategories(): Promise<Category[]> {
    const response = await api.get<ApiResponse<Category[]>>('/api/menu/categories');
    return response.data.data ?? [];
  },

  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const response = await api.post<ApiResponse<Category>>('/api/menu/categories', data);
    return response.data.data!;
  },

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
    const response = await api.patch<ApiResponse<Category>>(`/api/menu/categories/${id}`, data);
    return response.data.data!;
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/api/menu/categories/${id}`);
  },

  // ─── Items ────────────────────────────────────────────────────────────────────

  async getItems(): Promise<MenuItem[]> {
    const response = await api.get<ApiResponse<MenuItem[]>>('/api/menu/items');
    return response.data.data ?? [];
  },

  async createItem(data: CreateMenuItemRequest): Promise<MenuItem> {
    const response = await api.post<ApiResponse<MenuItem>>('/api/menu/items', data);
    return response.data.data!;
  },

  async updateItem(id: string, data: UpdateMenuItemRequest): Promise<MenuItem> {
    const response = await api.patch<ApiResponse<MenuItem>>(`/api/menu/items/${id}`, data);
    return response.data.data!;
  },

  async deleteItem(id: string): Promise<void> {
    await api.delete(`/api/menu/items/${id}`);
  },
};

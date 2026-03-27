// ─── Auth ────────────────────────────────────────────────────────────────────

export interface Admin {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable?: boolean;
  categoryId: string;
}

export interface UpdateMenuItemRequest extends Partial<CreateMenuItemRequest> {}

// ─── Tables ───────────────────────────────────────────────────────────────────

export interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  qrCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
  };
}

export interface CreateTableRequest {
  number: number;
  name: string;
  capacity: number;
}

export interface UpdateTableRequest extends Partial<CreateTableRequest> {
  isActive?: boolean;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  notes: string | null;
  menuItem: MenuItem;
}

export interface Order {
  id: string;
  tableId: string;
  customerName: string | null;
  customerNote: string | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  table?: Table;
  items: OrderItem[];
  payment?: Payment;
}

export interface PlaceOrderItemRequest {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface PlaceOrderRequest {
  tableId: string;
  customerName?: string;
  customerNote?: string;
  items: PlaceOrderItemRequest[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface OrdersFilter {
  status?: OrderStatus;
  tableId?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface TodayStats {
  totalOrders: number;
  totalRevenue: number;
  statusBreakdown: Record<OrderStatus, number>;
  topItems: Array<{
    menuItem: MenuItem;
    totalQuantity: number;
    totalRevenue: number;
  }>;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentMethod = 'QRIS' | 'VIRTUAL_ACCOUNT';
export type PaymentGateway = 'XENDIT' | 'DURIANPAY';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  gateway: PaymentGateway;
  status: PaymentStatus;
  amount: number;
  externalId: string | null;
  qrCode: string | null;
  paymentUrl: string | null;
  bankCode: string | null;
  virtualAccountNumber: string | null;
  expiredAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  method: PaymentMethod;
  gateway: PaymentGateway;
  bankCode?: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Cart (client-only) ───────────────────────────────────────────────────────

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(
  message: string,
  data?: T,
  pagination?: ApiResponse<T>['pagination'],
): ApiResponse<T> {
  return { success: true, message, data, pagination };
}

export function errorResponse(message: string, errors?: string[]): ApiResponse {
  return { success: false, message, errors };
}

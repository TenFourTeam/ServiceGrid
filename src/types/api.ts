/**
 * API and utility types for consistent type safety
 */

export interface ApiResponse<T = unknown> {
  data: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface MutationOptions {
  toast?: {
    success?: string;
    loading?: string;
    error?: string;
  };
}

export interface AuthApiInvokeOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  toast?: {
    success?: string;
    loading?: string;
    error?: string;
  };
}

export interface DatabaseOperationResult<T = unknown> {
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  totalPages?: number;
  currentPage?: number;
}

export interface FormValidationError {
  field: string;
  message: string;
}

export interface UrlParams {
  [key: string]: string | undefined;
}

export interface SearchParams {
  [key: string]: string | string[] | undefined;
}

export type UnknownRecord = Record<string, unknown>;
export type StringRecord = Record<string, string>;
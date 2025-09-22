/**
 * API Response Types for type-safe edge function responses
 */

// Generic API Error
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Generic API Response
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
}

// Navigation Props Interface
export interface NavigateProps {
  to: string;
  replace?: boolean;
  state?: unknown;
}

// Test Interfaces
export interface MockBusinessState {
  data: unknown;
  isLoading?: boolean;
  error?: Error | null;
}

// Calendar Types
export interface JobEventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  customerId?: string;
}

// Invoice Related Responses
export interface InvoiceResponse {
  invoice: {
    id: string;
    number: string;
    businessId: string;
    customerId: string;
    total: number;
    status: string;
    // ... other invoice fields
  };
}

export interface InvoiceUrlResponse {
  url: string;
}

// Job Related Responses
export interface JobResponse {
  job: {
    id: string;
    title: string;
    businessId: string;
    customerId: string;
    startsAt: string;
    endsAt: string;
    status: string;
    // ... other job fields
  };
}

export interface JobPhotoResponse {
  url: string;
}

// Customer Related Responses
export interface CustomerResponse {
  customer: {
    id: string;
    name: string;
    email: string;
    businessId: string;
    // ... other customer fields
  };
}

// Quote Related Responses
export interface QuoteResponse {
  quote: {
    id: string;
    number: string;
    businessId: string;
    customerId: string;
    total: number;
    status: string;
    // ... other quote fields
  };
}

// CSV Import Response
export interface CsvImportResponse {
  message: string;
  status: number;
  imported?: number;
}

// Form Data Types
export interface InvoiceUpdateData {
  jobId?: string;
  notesInternal?: string;
  address?: string;
  lineItems?: unknown[];
  taxRate?: number;
  discount?: number;
}

export interface JobUpdateData {
  title?: string;
  startsAt?: string;
  endsAt?: string;
  notes?: string;
  status?: string;
  address?: string;
}

export interface CustomerUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

// Rate Limiter Function Type
export type RateLimitedFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> = 
  (...args: TArgs) => Promise<TReturn>;

// Type Guards
export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'message' in value;
}

export function hasMessage(value: unknown): value is { message: string } {
  return typeof value === 'object' && value !== null && 'message' in value && typeof (value as any).message === 'string';
}

export function hasUrl(value: unknown): value is { url: string } {
  return typeof value === 'object' && value !== null && 'url' in value && typeof (value as any).url === 'string';
}

export function hasInvoice(value: unknown): value is { invoice: unknown } {
  return typeof value === 'object' && value !== null && 'invoice' in value;
}

export function hasJob(value: unknown): value is { job: unknown } {
  return typeof value === 'object' && value !== null && 'job' in value;
}

export function hasCustomer(value: unknown): value is { customer: unknown } {
  return typeof value === 'object' && value !== null && 'customer' in value;
}

export function hasQuote(value: unknown): value is { quote: unknown } {
  return typeof value === 'object' && value !== null && 'quote' in value;
}

export function hasStatus(value: unknown): value is { status: number } {
  return typeof value === 'object' && value !== null && 'status' in value && typeof (value as any).status === 'number';
}

export function hasImported(value: unknown): value is { imported: number } {
  return typeof value === 'object' && value !== null && 'imported' in value && typeof (value as any).imported === 'number';
}

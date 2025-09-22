/**
 * API response helper utilities
 * Provides consistent error handling and type guards for API responses
 */

import { hasMessage, hasUrl, hasInvoice, hasJob, hasCustomer, hasQuote, hasStatus, hasImported } from '@/types/api';

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  if (hasMessage(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

/**
 * Safely extract URL from unknown response type
 */
export function getResponseUrl(response: unknown): string | null {
  return hasUrl(response) ? response.url : null;
}

/**
 * Safely extract invoice from unknown response type
 */
export function getResponseInvoice(response: unknown): unknown | null {
  return hasInvoice(response) ? response.invoice : null;
}

/**
 * Safely extract job from unknown response type
 */
export function getResponseJob(response: unknown): unknown | null {
  return hasJob(response) ? response.job : null;
}

/**
 * Safely extract customer from unknown response type
 */
export function getResponseCustomer(response: unknown): unknown | null {
  return hasCustomer(response) ? response.customer : null;
}

/**
 * Safely extract quote from unknown response type
 */
export function getResponseQuote(response: unknown): unknown | null {
  return hasQuote(response) ? response.quote : null;
}

/**
 * Check if response has specific property with type guard
 */
export function hasProperty<T extends string>(
  obj: unknown, 
  property: T
): obj is Record<T, unknown> {
  return typeof obj === 'object' && obj !== null && property in obj;
}

/**
 * Safely get property from unknown object
 */
export function getProperty<T extends string>(
  obj: unknown, 
  property: T, 
  fallback: unknown = null
): unknown {
  return hasProperty(obj, property) ? obj[property] : fallback;
}

/**
 * Type-safe API error handler
 */
export function handleApiError(error: unknown, context: string): never {
  const message = getErrorMessage(error, `Failed to ${context}`);
  console.error(`[API Error] ${context}:`, error);
  throw new Error(message);
}

/**
 * Type-safe response validator
 */
export function validateResponse<T>(
  response: unknown,
  validator: (obj: unknown) => obj is T,
  errorContext: string
): T {
  if (validator(response)) {
    return response;
  }
  throw new Error(`Invalid response format for ${errorContext}`);
}
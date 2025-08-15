import { edgeRequest } from '@/utils/edgeApi';
import { toast } from 'sonner';

export interface ToastOptions {
  success?: string | false;
  error?: string | false;
  loading?: string | false;
}

/**
 * Enhanced edgeRequest with automatic toast notifications
 * Provides consistent user feedback across all API operations
 */
export async function edgeRequestWithToast(
  url: string, 
  init: RequestInit = {}, 
  toastOptions: ToastOptions = {}
): Promise<any> {
  const { 
    success = getDefaultSuccessMessage(init.method || 'GET'),
    error = 'Operation failed. Please try again.',
    loading = false
  } = toastOptions;

  let toastId: string | number | undefined;

  try {
    // Show loading toast if specified
    if (loading) {
      toastId = toast.loading(loading);
    }

    const result = await edgeRequest(url, init);

    // Dismiss loading toast
    if (toastId) {
      toast.dismiss(toastId);
    }

    // Show success toast if specified
    if (success) {
      toast.success(success);
    }

    return result;
  } catch (err: any) {
    // Dismiss loading toast
    if (toastId) {
      toast.dismiss(toastId);
    }

    // Show error toast if specified
    if (error) {
      const errorMessage = err?.message || error;
      toast.error(errorMessage);
    }

    throw err;
  }
}

/**
 * Get default success message based on HTTP method
 */
function getDefaultSuccessMessage(method: string): string | false {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'Created successfully';
    case 'PUT':
    case 'PATCH':
      return 'Updated successfully';
    case 'DELETE':
      return 'Deleted successfully';
    case 'GET':
    default:
      return false; // No success toast for GET requests by default
  }
}

/**
 * Convenience wrapper for common patterns
 */
export const edgeToast = {
  /**
   * Create operation with standard success message
   */
  create: (url: string, body: any, successMessage?: string) =>
    edgeRequestWithToast(url, {
      method: 'POST',
      body: JSON.stringify(body),
    }, {
      success: successMessage || 'Created successfully',
      loading: 'Creating...',
    }),

  /**
   * Update operation with standard success message
   */
  update: (url: string, body: any, successMessage?: string) =>
    edgeRequestWithToast(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, {
      success: successMessage || 'Updated successfully',
      loading: 'Updating...',
    }),

  /**
   * Delete operation with standard success message
   */
  delete: (url: string, successMessage?: string) =>
    edgeRequestWithToast(url, {
      method: 'DELETE',
    }, {
      success: successMessage || 'Deleted successfully',
      loading: 'Deleting...',
    }),

  /**
   * Send/email operation
   */
  send: (url: string, body: any, successMessage?: string) =>
    edgeRequestWithToast(url, {
      method: 'POST',
      body: JSON.stringify(body),
    }, {
      success: successMessage || 'Sent successfully',
      loading: 'Sending...',
    }),
};
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ToastOptions {
  success?: string | false;
  error?: string | false;
  loading?: string | false;
  onSuccess?: () => void;
}

/**
 * Authenticated edge function helper with integrated toast support
 * Creates a function that includes Clerk authentication tokens in edge function calls
 */
export function createAuthEdgeApi(getToken: (options?: { template?: string }) => Promise<string | null>) {
  return {
    /**
     * Invoke an edge function with automatic Clerk authentication and optional toast notifications
     */
    async invoke(
      functionName: string,
      options: {
        body?: any;
        method?: string;
        headers?: Record<string, string>;
        toast?: ToastOptions;
      } = {}
    ): Promise<{ data: any; error: any }> {
      const { toast: toastOptions, ...requestOptions } = options;
      const {
        success = getDefaultSuccessMessage(requestOptions.method || 'GET'),
        error: errorMessage = 'Operation failed. Please try again.',
        loading = false,
        onSuccess
      } = toastOptions || {};

      let toastId: string | number | undefined;

      try {
        console.info(`🔧 [AuthEdgeApi] === FRONTEND REQUEST START ===`);
        console.info(`🔧 [AuthEdgeApi] Function: ${functionName}`);
        console.info(`🔧 [AuthEdgeApi] Options:`, requestOptions);

        // Show loading toast if specified
        if (loading) {
          toastId = toast.loading(loading);
        }
        
        console.info(`🔧 [AuthEdgeApi] Getting Clerk token with 'supabase' template...`);
        const startToken = Date.now();
        const token = await getToken({ template: 'supabase' });
        const endToken = Date.now();
        console.info(`🔧 [AuthEdgeApi] Token fetch took ${endToken - startToken}ms`);
        
        if (!token) {
          console.warn('❌ [AuthEdgeApi] No Clerk token available');
          return {
            data: null,
            error: { message: 'Authentication required', status: 401 }
          };
        }

        console.info(`🔧 [AuthEdgeApi] Token obtained, length: ${token.length}`);
        console.info(`🔧 [AuthEdgeApi] Token prefix: ${token.substring(0, 20)}`);
        console.info(`🔧 [AuthEdgeApi] Token suffix: ${token.substring(token.length - 20)}`);
        
        // Try to decode token structure for debugging
        try {
          const [header, payload] = token.split('.');
          if (header && payload) {
            const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            console.info(`🔧 [AuthEdgeApi] Token payload preview:`, {
              sub: decodedPayload.sub,
              iss: decodedPayload.iss,
              exp: decodedPayload.exp,
              iat: decodedPayload.iat
            });
            console.info(`🔧 [AuthEdgeApi] Token expires: ${new Date(decodedPayload.exp * 1000).toISOString()}`);
            console.info(`🔧 [AuthEdgeApi] Current time: ${new Date().toISOString()}`);
          }
        } catch (decodeError) {
          console.warn('⚠️ [AuthEdgeApi] Could not decode token:', decodeError);
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...requestOptions.headers,
        };

        console.info(`🔧 [AuthEdgeApi] Prepared headers:`, Object.keys(headers));
        console.info(`🔧 [AuthEdgeApi] Calling ${functionName} with auth token`);

        const startInvoke = Date.now();
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: requestOptions.body,
          headers,
          method: (requestOptions.method as "POST" | "PUT" | "PATCH" | "DELETE" | "GET") || "POST",
        });
        const endInvoke = Date.now();
        console.info(`🔧 [AuthEdgeApi] Function call took ${endInvoke - startInvoke}ms`);

        // Dismiss loading toast
        if (toastId) {
          toast.dismiss(toastId);
        }

        if (error) {
          console.error(`❌ [AuthEdgeApi] Error from ${functionName}:`, error);
          console.error(`❌ [AuthEdgeApi] Error details:`, JSON.stringify(error, null, 2));
          
          // Show error toast if specified
          if (errorMessage) {
            toast.error(error?.message || errorMessage);
          }
        } else {
          console.info(`✅ [AuthEdgeApi] Success from ${functionName}`);
          
          // Show success toast if specified
          if (success) {
            toast.success(success);
          }

          // Call success callback if provided
          if (onSuccess) {
            onSuccess();
          }
        }

        return { data, error };
      } catch (error: any) {
        // Dismiss loading toast
        if (toastId) {
          toast.dismiss(toastId);
        }

        console.error(`❌ [AuthEdgeApi] Failed to invoke ${functionName}:`, error);
        console.error(`❌ [AuthEdgeApi] Error type:`, error.constructor.name);
        console.error(`❌ [AuthEdgeApi] Error stack:`, error.stack);

        // Show error toast if specified
        if (errorMessage) {
          toast.error(error?.message || errorMessage);
        }

        return {
          data: null,
          error: { message: error.message || 'Failed to call edge function' }
        };
      }
    }
  };
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

// Declare global Clerk types for TypeScript
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken(options?: { refresh?: boolean; skipCache?: boolean }): Promise<string>;
      };
    };
  }
}
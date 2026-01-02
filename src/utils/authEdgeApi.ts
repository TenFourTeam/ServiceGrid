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
 * Uses Supabase Auth JWT tokens automatically included by the client
 */
export function createAuthEdgeApi(getToken: (options?: { template?: string }) => Promise<string | null>) {
  return {
    /**
     * Invoke an edge function with automatic JWT authentication and optional toast notifications
     */
    async invoke(
      functionName: string,
      options: {
        body?: any;
        method?: string;
        headers?: Record<string, string>;
        queryParams?: Record<string, string>;
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

        // Get JWT token from Supabase session with retry logic
        console.info(`🔧 [AuthEdgeApi] Getting session token...`);
        const startToken = Date.now();
        
        let token: string | null = null;
        const maxRetries = 3;
        const retryDelay = 200;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          token = await getToken({ template: 'supabase' });
          if (token) break;
          
          if (attempt < maxRetries) {
            console.info(`🔧 [AuthEdgeApi] Token not available, retry ${attempt}/${maxRetries} in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
        
        const endToken = Date.now();
        console.info(`🔧 [AuthEdgeApi] Token fetch took ${endToken - startToken}ms (${token ? 'success' : 'failed'})`);
        
        if (!token) {
          console.warn('❌ [AuthEdgeApi] No session token available after retries');
          if (toastId) {
            toast.dismiss(toastId);
          }
          return {
            data: null,
            error: { message: 'Authentication required. Please sign in.', status: 401 }
          };
        }

        console.info(`🔧 [AuthEdgeApi] Token obtained, length: ${token.length}`);
        
        // Use Authorization header with Bearer token (Supabase standard)
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`,
          ...(requestOptions.headers || {}),
        };

        const bodyToSend = requestOptions.body;

        console.info(`🔧 [AuthEdgeApi] Prepared headers:`, Object.keys(headers));
        console.info(`🔧 [AuthEdgeApi] Calling ${functionName} with JWT auth`);

        // Build function URL with query parameters if provided
        let functionUrl = functionName;
        if (requestOptions.queryParams) {
          const searchParams = new URLSearchParams(requestOptions.queryParams);
          functionUrl = `${functionName}?${searchParams.toString()}`;
          console.info(`🔧 [AuthEdgeApi] Function URL with query params: ${functionUrl}`);
        }

        const startInvoke = Date.now();
        const response = await supabase.functions.invoke(functionUrl, {
          body: bodyToSend,
          headers,
          method: (requestOptions.method as "POST" | "PUT" | "PATCH" | "DELETE" | "GET") || "POST",
        });
        const endInvoke = Date.now();
        console.info(`🔧 [AuthEdgeApi] Function call took ${endInvoke - startInvoke}ms`);

        // Handle potential mislabeled JSON responses robustly
        let data = response.data;
        const error = response.error;
        
        // If data is a string that looks like JSON, try to parse it
        if (typeof data === 'string' && /^\s*[{[]/.test(data)) {
          try {
            data = JSON.parse(data);
            console.info(`🔧 [AuthEdgeApi] Parsed string response as JSON for ${functionName}`);
          } catch (parseError) {
            console.warn(`⚠️ [AuthEdgeApi] Failed to parse string response as JSON:`, parseError);
          }
        }

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

        return { data: data as any, error: error as any };
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
  // Remove automatic success toasts - let callers handle their own
  return false;
}

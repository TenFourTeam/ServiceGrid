import { supabase } from '@/integrations/supabase/client';

/**
 * Authenticated edge function helper
 * Creates a function that includes Clerk authentication tokens in edge function calls
 */
export function createAuthEdgeApi(getToken: () => Promise<string | null>) {
  return {
    /**
     * Invoke an edge function with automatic Clerk authentication
     */
    async invoke(
      functionName: string,
      options: {
        body?: any;
        method?: string;
        headers?: Record<string, string>;
      } = {}
    ): Promise<{ data: any; error: any }> {
      try {
        const token = await getToken();
        
        if (!token) {
          console.warn('[AuthEdgeApi] No Clerk token available');
          return {
            data: null,
            error: { message: 'Authentication required', status: 401 }
          };
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        };

        console.info(`[AuthEdgeApi] Calling ${functionName} with auth token`);

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: options.body,
          headers,
        });

        if (error) {
          console.error(`[AuthEdgeApi] Error from ${functionName}:`, error);
        }

        return { data, error };
      } catch (error: any) {
        console.error(`[AuthEdgeApi] Failed to invoke ${functionName}:`, error);
        return {
          data: null,
          error: { message: error.message || 'Failed to call edge function' }
        };
      }
    }
  };
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
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
        console.info(`🔧 [AuthEdgeApi] === FRONTEND REQUEST START ===`);
        console.info(`🔧 [AuthEdgeApi] Function: ${functionName}`);
        console.info(`🔧 [AuthEdgeApi] Options:`, options);
        
        console.info(`🔧 [AuthEdgeApi] Getting Clerk token...`);
        const startToken = Date.now();
        const token = await getToken();
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
          ...options.headers,
        };

        console.info(`🔧 [AuthEdgeApi] Prepared headers:`, Object.keys(headers));
        console.info(`🔧 [AuthEdgeApi] Calling ${functionName} with auth token`);

        const startInvoke = Date.now();
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: options.body,
          headers,
        });
        const endInvoke = Date.now();
        console.info(`🔧 [AuthEdgeApi] Function call took ${endInvoke - startInvoke}ms`);

        if (error) {
          console.error(`❌ [AuthEdgeApi] Error from ${functionName}:`, error);
          console.error(`❌ [AuthEdgeApi] Error details:`, JSON.stringify(error, null, 2));
        } else {
          console.info(`✅ [AuthEdgeApi] Success from ${functionName}`);
        }

        return { data, error };
      } catch (error: any) {
        console.error(`❌ [AuthEdgeApi] Failed to invoke ${functionName}:`, error);
        console.error(`❌ [AuthEdgeApi] Error type:`, error.constructor.name);
        console.error(`❌ [AuthEdgeApi] Error stack:`, error.stack);
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
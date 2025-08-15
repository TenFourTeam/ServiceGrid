// Centralized Edge Function HTTP utilities
// - Single source of truth for SUPABASE_URL
// - Authenticated and public JSON helpers

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: (options?: { refresh?: boolean }) => Promise<string | null>;
      };
    };
  }
}

export const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
  isRetryable: boolean;
  
  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    // Determine if error is retryable based on status
    this.isRetryable = status >= 500 || status === 429 || status === 408;
  }
  
  static isAuthError(error: unknown): boolean {
    return error instanceof ApiError && (error.status === 401 || error.status === 403);
  }
  
  static isNetworkError(error: unknown): boolean {
    return error instanceof ApiError && error.code === 'network_error';
  }
}

export type EdgeRequestOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
};


// Simplified edge request using Clerk directly
export async function edgeRequest(url: string, init: RequestInit = {}): Promise<any> {
  console.info('[edgeRequest] Starting request to:', url, { hasBody: !!init.body });
  
  // Get token directly from Clerk
  const token = await window.Clerk?.session?.getToken();
  if (!token) {
    console.error('[edgeRequest] No authentication token available');
    throw new ApiError(401, 'Authentication required', 'auth_required');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(init.headers || {}),
  } as Record<string, string>;

  // Only set Content-Type for non-FormData requests
  // FormData requires browser to set multipart boundary automatically
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  console.info('[edgeRequest] Making request with token prefix:', token.substring(0, 20) + '...');
  
  try {
    const res = await fetch(url, { ...init, headers });
    console.info('[edgeRequest] Response status:', res.status, res.statusText);

    const body = await (async () => { 
      try { 
        const jsonBody = await res.json();
        console.info('[edgeRequest] Response body:', jsonBody);
        return jsonBody;
      } catch (parseError) { 
        console.warn('[edgeRequest] Failed to parse response as JSON:', parseError);
        return null; 
      } 
    })();

    if (!res.ok) {
      const msg = body?.error?.message || res.statusText || `HTTP ${res.status}`;
      const code = body?.error?.code || 'request_failed';
      
      console.error('[edgeRequest] Request failed:', { 
        status: res.status, 
        code, 
        msg, 
        body,
        url 
      });
      
      // If it's a 401/403, the token might be invalid
      if (res.status === 401 || res.status === 403) {
        console.error('[edgeRequest] Authentication error - token may be invalid or expired');
      }
      
      throw new ApiError(res.status, msg, code, body?.error?.details);
    }
    
    console.info('[edgeRequest] Request successful');
    return body?.data ?? body;
    
  } catch (fetchError) {
    console.error('[edgeRequest] Network error:', fetchError);
    
    // Re-throw ApiError as-is, wrap other errors
    if (fetchError instanceof ApiError) {
      throw fetchError;
    }
    
    throw new ApiError(
      500,
      fetchError instanceof Error ? fetchError.message : 'Network error occurred',
      'network_error',
      fetchError
    );
  }
}

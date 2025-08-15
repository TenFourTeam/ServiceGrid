// Centralized Edge Function HTTP utilities
// - Single source of truth for SUPABASE_URL
// - Authenticated and public JSON helpers

import { getApiTokenStrict } from "@/auth/token";

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

// Legacy functions - deprecated, use edgeRequest instead
export async function edgeFetchJson(
  path: string,
  getToken: () => Promise<string | null>,
  opts: EdgeRequestOptions = {}
) {
  console.warn('[DEPRECATED] edgeFetchJson is deprecated. Use edgeRequest instead.');
  return edgeRequest(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export async function edgePublicJson(path: string, opts: EdgeRequestOptions = {}) {
  console.warn('[DEPRECATED] edgePublicJson is deprecated. Use fetch directly or edgeRequest.');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new ApiError(res.status, `Edge ${path} failed: ${txt}`, 'edge_public_failed');
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return null;
}

export async function edgeFetch(
  path: string,
  getToken: () => Promise<string | null>,
  opts: EdgeRequestOptions = {}
) {
  console.warn('[DEPRECATED] edgeFetch is deprecated. Use edgeRequest instead.');
  return edgeRequest(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: opts.method || "GET",
    headers: opts.headers || {},
    body: opts.body,
  });
}

// Simplified edge request with bulletproof error handling and retry logic
export async function edgeRequest(url: string, init: RequestInit = {}): Promise<any> {
  console.info('[edgeRequest] Starting request to:', url, { hasBody: !!init.body });
  
  // Try to get a fresh token with retry logic
  let token: string | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.info(`[edgeRequest] Getting token (attempt ${attempt}/3)`);
      token = await window.Clerk?.session?.getToken({ refresh: attempt > 1 });
      if (token) {
        console.info('[edgeRequest] Successfully obtained token');
        break;
      } else {
        console.warn(`[edgeRequest] No token received on attempt ${attempt}`);
      }
    } catch (err) {
      console.error(`[edgeRequest] Token fetch failed on attempt ${attempt}:`, err);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  if (!token) {
    console.error('[edgeRequest] Failed to obtain token after 3 attempts');
    throw new ApiError(401, 'Authentication failed - unable to obtain token', 'auth_failed');
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(init.headers || {}),
  };

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

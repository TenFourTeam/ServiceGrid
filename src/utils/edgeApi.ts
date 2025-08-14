// Centralized Edge Function HTTP utilities
// - Single source of truth for SUPABASE_URL
// - Authenticated and public JSON helpers

import { getClerkTokenStrict } from "@/utils/clerkToken";

export const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
  
  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type EdgeRequestOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
};

// Authenticated JSON fetch using Clerk token
export async function edgeFetchJson(
  path: string,
  getToken: () => Promise<string | null>,
  opts: EdgeRequestOptions = {}
) {
  const token = await getClerkTokenStrict(getToken);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Edge ${path} failed (${res.status}): ${txt}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return null;
}

// Public JSON fetch (no auth header)
export async function edgePublicJson(path: string, opts: EdgeRequestOptions = {}) {
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
    throw new Error(`Edge ${path} failed (${res.status}): ${txt}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return null;
}

// Generic authenticated fetch (no forced JSON headers) - supports FormData uploads
export async function edgeFetch(
  path: string,
  getToken: () => Promise<string | null>,
  opts: EdgeRequestOptions = {}
) {
  const token = await getClerkTokenStrict(getToken);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
    body: opts.body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Edge ${path} failed (${res.status}): ${txt}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return null;
}

// Simplified edge request with bulletproof error handling
export async function edgeRequest(url: string, init: RequestInit = {}): Promise<any> {
  console.info('[edgeRequest] calling', { url, hasBody: !!init.body });
  
  const token = await window.Clerk?.session?.getToken({ refresh: true });
  
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  
  const res = await fetch(url, { ...init, headers });
  
  const body = await (async () => { 
    try { 
      return await res.json(); 
    } catch { 
      return null; 
    } 
  })();

  if (!res.ok) {
    const msg = body?.error?.message || res.statusText || `HTTP ${res.status}`;
    const code = body?.error?.code;
    console.error('[edgeRequest] failed', { status: res.status, code, msg, body });
    throw new ApiError(res.status, msg, code, body?.error?.details);
  }
  
  console.info('[edgeRequest] success', { hasData: !!body });
  return body?.data ?? body;
}

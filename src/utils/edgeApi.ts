// Centralized Edge Function HTTP utilities
// - Single source of truth for SUPABASE_URL
// - Authenticated and public JSON helpers

import { getClerkTokenStrict } from "@/utils/clerkToken";

export const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

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

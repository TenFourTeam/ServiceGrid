
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    ...init,
  });
}

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceKey);
}

async function resolveOwnerIdFromClerk(req: Request): Promise<string> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");

  const payload = await verifyToken(token, { secretKey });
  const clerkSub = (payload as any).sub as string;
  const email = (payload as any)?.email as string | undefined;

  const supabase = createAdminClient();

  // Prefer mapping via clerk_user_id
  let { data: profByClerk, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkSub)
    .limit(1)
    .maybeSingle();
  if (profErr) throw profErr;

  if (profByClerk?.id) return profByClerk.id as string;

  // Fallback by email if available
  if (email) {
    const { data: profByEmail, error: profByEmailErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (profByEmailErr) throw profByEmailErr;
    if (profByEmail?.id) return profByEmail.id as string;
  }

  throw new Error("Unable to resolve user profile");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // Enforce allowed origins from ALLOWED_ORIGINS
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.length && !allowed.includes("*") && !allowed.includes(origin)) {
    return json({ error: "Origin not allowed" }, { status: 403 });
  }
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const ownerId = await resolveOwnerIdFromClerk(req);
    const supabase = createAdminClient();

    // Find existing business via membership (single business per user model)
    const { data: membership, error: memberErr } = await supabase
      .from("business_members")
      .select(`
        business_id,
        businesses(id, name, phone, reply_to_email, logo_url, light_logo_url, tax_rate_default, inv_prefix, inv_seq, est_prefix, est_seq, created_at)
      `)
      .eq("user_id", ownerId)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();
    if (memberErr) throw memberErr;

    let biz = membership?.businesses;

    if (!biz?.id) {
      // Use ensure_default_business function for atomic business + membership creation
      const { data: defaultBiz, error: ensureErr } = await supabase.rpc('ensure_default_business');
      if (ensureErr) throw ensureErr;
      biz = defaultBiz;
    }

    // Get user's role from business_members table
    const { data: memberData } = await supabase
      .from("business_members")
      .select("role")
      .eq("business_id", biz.id)
      .eq("user_id", ownerId)
      .limit(1)
      .maybeSingle();
    
    const role = memberData?.role || 'worker';

    return json({ 
      business: biz,
      role: role,
      tenantId: biz.id,
      roles: [role]
    });
  } catch (e: any) {
    console.error("[get-business] error:", e);
    const msg = e?.message || String(e);
    const status = /unauthorized|missing bearer|resolve user/i.test(msg) ? 401 : 500;
    return json({ error: msg }, { status });
  }
});


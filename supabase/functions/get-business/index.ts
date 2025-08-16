
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

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
    console.log("[get-business] Starting business resolution");
    const { userId: ownerId, supaAdmin: supabase } = await requireCtx(req);
    console.log(`[get-business] Resolved owner ID: ${ownerId}`);

    // Find existing business via membership (single business per user model)
    console.log("[get-business] Querying for existing business membership");
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
    
    if (memberErr) {
      console.error("[get-business] Membership query error:", memberErr);
      throw memberErr;
    }

    console.log(`[get-business] Membership query result:`, membership ? "found" : "not found");
    let biz = membership?.businesses;

    if (!biz?.id) {
      console.log("[get-business] No existing business found, creating default business");
      // Use ensure_default_business function for atomic business + membership creation
      const { data: defaultBiz, error: ensureErr } = await supabase.rpc('ensure_default_business');
      if (ensureErr) {
        console.error("[get-business] ensure_default_business error:", ensureErr);
        throw ensureErr;
      }
      console.log(`[get-business] Created default business: ${defaultBiz?.id}`);
      biz = defaultBiz;
    } else {
      console.log(`[get-business] Using existing business: ${biz.id}`);
    }

    // Get user's role from business_members table
    console.log("[get-business] Fetching user role");
    const { data: memberData, error: roleErr } = await supabase
      .from("business_members")
      .select("role")
      .eq("business_id", biz.id)
      .eq("user_id", ownerId)
      .limit(1)
      .maybeSingle();
    
    if (roleErr) {
      console.error("[get-business] Role query error:", roleErr);
    }
    
    const role = memberData?.role || 'worker';
    console.log(`[get-business] User role: ${role}`);

    const response = { 
      business: biz,
      role: role,
      tenantId: biz.id,
      roles: [role]
    };
    
    console.log("[get-business] Success - returning business data");
    return json(response);
  } catch (e: any) {
    console.error("[get-business] error:", e);
    const msg = e?.message || String(e);
    const status = /unauthorized|missing bearer|resolve user/i.test(msg) ? 401 : 500;
    return json({ error: msg }, { status });
  }
});


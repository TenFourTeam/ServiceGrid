
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

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
  return createClient(url, serviceKey, { auth: { persistSession: false } });
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

  let { data: profByClerk, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkSub)
    .limit(1)
    .maybeSingle();
  if (profErr) throw profErr;
  if (profByClerk?.id) return profByClerk.id as string;

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
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const ownerId = await resolveOwnerIdFromClerk(req);
    const supabase = createAdminClient();

    // Find the user's business (oldest)
    const { data: biz, error: selErr } = await supabase
      .from("businesses")
      .select("id, stripe_account_id")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (selErr) throw selErr;

    if (!biz?.id) {
      return json({ success: true, message: "No business found" });
    }

    // Soft disconnect: clear Stripe fields so the app treats the account as disconnected
    const { error: upErr } = await supabase
      .from("businesses")
      .update({
        stripe_account_id: null,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_details_submitted: false,
      })
      .eq("id", biz.id);
    if (upErr) throw upErr;

    return json({ success: true });
  } catch (e: any) {
    console.error("[connect-disconnect] error:", e);
    const msg = e?.message || String(e);
    return json({ error: msg }, { status: /missing bearer|unauthorized/i.test(msg) ? 401 : 500 });
  }
});

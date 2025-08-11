
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

async function resolveOwnerIdFromClerk(req: Request): Promise<{ ownerId: string; email?: string }> {
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
  if (profByClerk?.id) return { ownerId: profByClerk.id as string, email };

  if (email) {
    const { data: profByEmail, error: profByEmailErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (profByEmailErr) throw profByEmailErr;
    if (profByEmail?.id) return { ownerId: profByEmail.id as string, email };
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
    const { ownerId } = await resolveOwnerIdFromClerk(req);
    const origin = req.headers.get("Origin") || req.headers.get("origin") || "";
    const refreshUrl = origin ? `${origin}/invoices?onboarding=refresh` : "https://example.com/invoices?onboarding=refresh";
    const returnUrl = origin ? `${origin}/invoices?onboarding=return` : "https://example.com/invoices?onboarding=return";

    const supabase = createAdminClient();

    // Find existing business (oldest) or create a new one
    let { data: biz, error: selErr } = await supabase
      .from("businesses")
      .select("id, name, stripe_account_id, application_fee_bps")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (selErr) throw selErr;

    if (!biz?.id) {
      const { data: ins, error: insErr } = await supabase
        .from("businesses")
        .insert({ name: "My Business", owner_id: ownerId })
        .select("id, name, stripe_account_id, application_fee_bps")
        .single();
      if (insErr) throw insErr;
      biz = ins;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

    let accountId = biz.stripe_account_id as string | null;
    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: "Invoices and services sold via marketplace",
        },
      });
      accountId = acct.id;

      const { error: upErr } = await supabase
        .from("businesses")
        .update({ stripe_account_id: accountId })
        .eq("id", biz.id);
      if (upErr) throw upErr;
    }

    const link = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return json({ url: link.url });
  } catch (e: any) {
    console.error("[connect-onboarding-link] error:", e);
    const msg = e?.message || String(e);
    return json({ error: msg }, { status: /missing bearer|unauthorized/i.test(msg) ? 401 : 500 });
  }
});

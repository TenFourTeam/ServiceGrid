
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
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const ownerId = await resolveOwnerIdFromClerk(req);
    const supabase = createAdminClient();

    // Load vendor business
    const { data: biz, error: selErr } = await supabase
      .from("businesses")
      .select("id, stripe_account_id, application_fee_bps")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (selErr) throw selErr;

    if (!biz?.id) {
      return json({
        stripeAccountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        bank: null,
        schedule: null,
        applicationFeeBps: 0,
      });
    }

    if (!biz.stripe_account_id) {
      return json({
        stripeAccountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        bank: null,
        schedule: null,
        applicationFeeBps: biz.application_fee_bps ?? 0,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    const acct = await stripe.accounts.retrieve(biz.stripe_account_id);

    const chargesEnabled = !!acct.charges_enabled;
    const payoutsEnabled = !!acct.payouts_enabled;
    const detailsSubmitted = !!acct.details_submitted;

    // Try to find a bank account last4 + bank name
    let bank: { bankName?: string; last4?: string } | null = null;
    const ea = (acct as any).external_accounts;
    if (ea?.data?.length) {
      const first = ea.data.find((it: any) => it.object === "bank_account") || ea.data[0];
      if (first) {
        bank = {
          bankName: first.bank_name,
          last4: first.last4,
        };
      }
    }

    const schedule = acct.settings?.payouts?.schedule
      ? {
          interval: (acct.settings.payouts.schedule.interval || "manual") as string,
          delay_days: acct.settings.payouts.schedule.delay_days as number | null,
        }
      : null;

    // Reflect flags back into DB for quick reads
    const { error: upErr } = await supabase
      .from("businesses")
      .update({
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_details_submitted: detailsSubmitted,
      })
      .eq("id", biz.id);
    if (upErr) console.warn("[connect-account-status] warn updating flags:", upErr.message);

    return json({
      stripeAccountId: acct.id,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      bank,
      schedule,
      applicationFeeBps: biz.application_fee_bps ?? 0,
    });
  } catch (e: any) {
    console.error("[connect-account-status] error:", e);
    const msg = e?.message || String(e);
    return json({ error: msg }, { status: /missing bearer|unauthorized/i.test(msg) ? 401 : 500 });
  }
});


import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { userId: ownerId, supaAdmin: supabase } = await requireCtx(req);

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

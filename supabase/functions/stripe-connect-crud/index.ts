import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, supaAdmin: supabase } = await requireCtx(req);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // GET - Get account status or onboarding link
    if (req.method === "GET") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");

      // Find the user's business
      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("id, stripe_account_id, application_fee_bps")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (bizErr) throw bizErr;
      if (!biz) {
        return json({ error: "No business found" }, { status: 404 });
      }

      if (action === "onboarding_link") {
        const origin = req.headers.get("origin") || "http://localhost:8080";
        const refreshUrl = `${origin}/settings`;
        const returnUrl = `${origin}/settings`;

        let accountId = biz.stripe_account_id;

        // Create account if needed
        if (!accountId) {
          const account = await stripe.accounts.create({
            type: "express",
            capabilities: {
              transfers: { requested: true },
              card_payments: { requested: true },
            },
          });
          accountId = account.id;

          await supabase
            .from("businesses")
            .update({ stripe_account_id: accountId })
            .eq("id", biz.id);
        }

        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: "account_onboarding",
        });

        return json({ url: accountLink.url });
      }

      // Default: return account status
      if (!biz.stripe_account_id) {
        return json({
          stripeAccountId: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          bank: null,
          schedule: null,
          applicationFeeBps: biz.application_fee_bps,
        });
      }

      const account = await stripe.accounts.retrieve(biz.stripe_account_id);
      const chargesEnabled = account.charges_enabled || false;
      const payoutsEnabled = account.payouts_enabled || false;
      const detailsSubmitted = account.details_submitted || false;

      let bankInfo = null;
      if (account.external_accounts?.data?.length > 0) {
        const bank = account.external_accounts.data[0] as any;
        bankInfo = {
          bankName: bank.bank_name || null,
          last4: bank.last4 || null,
        };
      }

      let scheduleInfo = null;
      if (account.settings?.payouts?.schedule) {
        const sched = account.settings.payouts.schedule;
        scheduleInfo = {
          interval: sched.interval,
          delay_days: sched.delay_days,
        };
      }

      // Update business flags
      await supabase
        .from("businesses")
        .update({
          stripe_charges_enabled: chargesEnabled,
          stripe_payouts_enabled: payoutsEnabled,
          stripe_details_submitted: detailsSubmitted,
        })
        .eq("id", biz.id);

      return json({
        stripeAccountId: biz.stripe_account_id,
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        bank: bankInfo,
        schedule: scheduleInfo,
        applicationFeeBps: biz.application_fee_bps,
      });
    }

    // POST - Disconnect account
    if (req.method === "POST") {
      const { action } = await req.json().catch(() => ({}));

      if (action === "disconnect") {
        const { data: biz, error: bizErr } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (bizErr) throw bizErr;
        if (!biz) {
          return json({ success: true, message: "No business found" });
        }

        await supabase
          .from("businesses")
          .update({
            stripe_account_id: null,
            stripe_charges_enabled: false,
            stripe_payouts_enabled: false,
            stripe_details_submitted: false,
          })
          .eq("id", biz.id);

        return json({ success: true });
      }

      return json({ error: "Unknown action" }, { status: 400 });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (e: any) {
    console.error("[stripe-connect-crud] error:", e);
    const msg = e?.message || String(e);
    return json({ error: msg }, { status: 500 });
  }
});

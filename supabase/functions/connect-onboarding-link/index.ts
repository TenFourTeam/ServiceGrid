
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { userId, supaAdmin: supabase } = await requireCtx(req);
    const origin = req.headers.get("Origin") || req.headers.get("origin") || "";
    const refreshUrl = origin ? `${origin}/invoices?onboarding=refresh` : "https://example.com/invoices?onboarding=refresh";
    const returnUrl = origin ? `${origin}/invoices?onboarding=return` : "https://example.com/invoices?onboarding=return";

    // Find existing business (oldest) or create a new one
    let { data: biz, error: selErr } = await supabase
      .from("businesses")
      .select("id, name, stripe_account_id, application_fee_bps")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (selErr) throw selErr;

    if (!biz?.id) {
      const { data: ins, error: insErr } = await supabase
        .from("businesses")
        .insert({ name: "My Business", owner_id: userId })
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
        .eq("id", (biz as any).id);
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

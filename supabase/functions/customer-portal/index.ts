import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

// Remove resolveEmailWithFallback - using requireCtx instead

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");

    const { email } = await requireCtx(req);
    logStep("Resolved email", { email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Ensure a Stripe customer exists for this email
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      const created = await stripe.customers.create({ email });
      customerId = created.id;
      logStep("Created new Stripe customer", { customerId });
    }

    const origin = req.headers.get("origin") || "http://localhost:8080";
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });
    logStep("Created billing portal session", { sessionId: portal.id });

    return json({ url: portal.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return json({ error: msg }, { status: 500 });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, meta?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${meta ? ` ${JSON.stringify(meta)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr) throw new Error(userErr.message);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or no email");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined = customers.data[0]?.id;

    if (!customerId) {
      const created = await stripe.customers.create({ email: user.email });
      customerId = created.id;
    }

    const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    let subscribed = subs.data.length > 0;
    let subscriptionTier: string | null = null;
    let subscriptionEnd: string | null = null;

    if (subscribed) {
      const sub = subs.data[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      const amount = sub.items.data[0].price.unit_amount || 0;
      subscriptionTier = amount >= 50400 ? "Yearly" : "Monthly";
    }

    await supabase.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    return new Response(JSON.stringify({ subscribed, subscription_tier: subscriptionTier, subscription_end: subscriptionEnd }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log('ERROR', { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

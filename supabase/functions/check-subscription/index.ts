import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId: ownerId, email, supaAdmin } = await requireCtx(req);
    
    // Get user creation date from profiles table
    const { data: profileData } = await supaAdmin
      .from('profiles')
      .select('created_at')
      .eq('id', ownerId)
      .single();
    
    const userCreatedAt = profileData?.created_at || new Date().toISOString();

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: email || undefined, limit: 1 });

    let customerId: string | undefined = customers.data[0]?.id;
    if (!customerId && email) {
      const created = await stripe.customers.create({ email });
      customerId = created.id;
    }

    const subs = await stripe.subscriptions.list({ customer: customerId!, status: "active", limit: 1 });
    const subscribed = subs.data.length > 0;
    let subscription_tier: string | null = null;
    let subscription_end: string | null = null;

    if (subscribed) {
      const sub = subs.data[0];
      subscription_end = new Date(sub.current_period_end * 1000).toISOString();
      const amt = sub.items.data[0].price.unit_amount || 0;
      subscription_tier = amt >= 50400 ? "Yearly" : "Monthly";
    }

    await supaAdmin.from("subscribers").upsert({
      email,
      user_id: ownerId,
      stripe_customer_id: customerId,
      subscribed,
      subscription_tier,
      subscription_end,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });

    return new Response(JSON.stringify({ subscribed, subscription_tier, subscription_end, userCreatedAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

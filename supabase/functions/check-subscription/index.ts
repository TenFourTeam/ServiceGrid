import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

async function fetchClerkUserCreationDate(clerkUserId: string, secretKey: string) {
  try {
    console.log(`[TRIAL-FIX] Fetching creation date for Clerk user: ${clerkUserId}`);
    const response = await fetch(`https://api.clerk.dev/v1/users/${clerkUserId}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`[TRIAL-FIX] Failed to fetch user from Clerk API: ${response.status}`);
      return new Date().toISOString();
    }
    
    const userData = await response.json();
    console.log(`[TRIAL-FIX] Raw created_at from Clerk:`, userData.created_at, typeof userData.created_at);
    
    let createdDate;
    if (typeof userData.created_at === 'number') {
      const timestamp = userData.created_at.toString().length === 10 ? userData.created_at * 1000 : userData.created_at;
      createdDate = new Date(timestamp);
    } else if (typeof userData.created_at === 'string') {
      createdDate = new Date(userData.created_at);
    } else {
      throw new Error('Unexpected created_at format');
    }
    
    const isoString = createdDate.toISOString();
    console.log(`[TRIAL-FIX] Converted to ISO string:`, isoString);
    return isoString;
  } catch (error) {
    console.warn(`[TRIAL-FIX] Error fetching user creation date from Clerk:`, error);
    return new Date().toISOString();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clerkUserId, userId: ownerId, email, supaAdmin } = await requireCtx(req);
    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");
    const userCreatedAt = await fetchClerkUserCreationDate(clerkUserId, secretKey);

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

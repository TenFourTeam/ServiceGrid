import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function fetchClerkUserCreationDate(clerkUserId: string, secretKey: string) {
  try {
    // Use Clerk's management API to get user details
    const response = await fetch(`https://api.clerk.dev/v1/users/${clerkUserId}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch user from Clerk API: ${response.status}`);
      return new Date().toISOString(); // Fallback to current date
    }
    
    const userData = await response.json();
    return new Date(userData.created_at * 1000).toISOString();
  } catch (error) {
    console.warn(`Error fetching user creation date from Clerk:`, error);
    return new Date().toISOString(); // Fallback to current date
  }
}

async function resolveOwnerIdFromClerk(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Missing Authorization header");
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");
  const payload = await verifyToken(token, { secretKey });
  const clerkSub = (payload as any).sub as string;
  const email = (payload as any)?.email as string | undefined;
  // Get actual user creation date from Clerk API
  const userCreatedAt = await fetchClerkUserCreationDate(clerkSub, secretKey);
  const supabase = createAdminClient();

  // Try mapping by clerk_user_id first
  let { data: profByClerk, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkSub)
    .limit(1)
    .maybeSingle();
  if (profErr) throw profErr;
  if (profByClerk?.id) return { ownerId: profByClerk.id as string, email, userCreatedAt };

  if (email) {
    const { data: profByEmail, error: profByEmailErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (profByEmailErr) throw profByEmailErr;
    if (profByEmail?.id) return { ownerId: profByEmail.id as string, email, userCreatedAt };
  }

  throw new Error("Unable to resolve user profile");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ownerId, email, userCreatedAt } = await resolveOwnerIdFromClerk(req);

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

    const supabase = createAdminClient();
    await supabase.from("subscribers").upsert({
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

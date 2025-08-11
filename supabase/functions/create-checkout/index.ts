import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function resolveEmailWithFallback(authToken: string, secretKey: string): Promise<{ email: string; clerkUserId?: string }>
{
  const payload = await verifyToken(authToken, { secretKey });
  const clerkUserId = (payload as any)?.sub as string | undefined;

  // 1) Try direct claim
  let email: string | undefined = (payload as any)?.email as string | undefined;

  // 2) Try email_addresses array in the token (if present)
  if (!email) {
    const primaryId = (payload as any)?.primary_email_address_id as string | undefined;
    const emailAddresses = (payload as any)?.email_addresses as any[] | undefined;
    if (Array.isArray(emailAddresses) && emailAddresses.length) {
      if (primaryId) {
        const match = emailAddresses.find((e: any) => e.id === primaryId);
        email = match?.email_address || emailAddresses[0]?.email_address;
      } else {
        email = emailAddresses[0]?.email_address;
      }
    }
  }

  // 3) Fetch from Clerk Users API as a reliable fallback
  if (!email && clerkUserId) {
    const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (res.ok) {
      const user = await res.json();
      const primaryId = user.primary_email_address_id as string | undefined;
      const emails = (user.email_addresses as any[]) || [];
      if (emails.length) {
        if (primaryId) {
          const match = emails.find((e) => e.id === primaryId);
          email = match?.email_address || emails[0]?.email_address;
        } else {
          email = emails[0]?.email_address;
        }
      }
    }
  }

  // 4) Fallback to Supabase profiles table if mapped via clerk_user_id
  if (!email && clerkUserId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();
    email = data?.email ?? undefined;
  }

  if (!email) throw new Error("User email not available");
  return { email, clerkUserId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");

    const { email } = await resolveEmailWithFallback(token, secretKey);

    const body = await req.json().catch(() => ({}));
    const plan = (body?.plan as string) || "monthly"; // 'monthly' | 'yearly'

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const unitAmount = plan === "yearly" ? 50400 : 5000; // $504/yr or $50/mo
    const interval = plan === "yearly" ? "year" : "month";

    const origin = req.headers.get("origin") || "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: plan === "yearly" ? "Pro Yearly" : "Pro Monthly" },
            unit_amount: unitAmount,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 },
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=canceled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
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

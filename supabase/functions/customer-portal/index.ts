import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function resolveEmailWithFallback(
  authToken: string,
  clerkSecretKey: string
): Promise<{ email: string; clerkUserId?: string }> {
  const payload = await verifyToken(authToken, { secretKey: clerkSecretKey });
  const clerkUserId = (payload as any)?.sub as string | undefined;

  // 1) Direct claim
  let email: string | undefined = (payload as any)?.email as string | undefined;

  // 2) Inspect token's email_addresses array
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

  // 3) Clerk Users API
  if (!email && clerkUserId) {
    const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: { Authorization: `Bearer ${clerkSecretKey}` },
    });
    if (res.ok) {
      const user = await res.json();
      const primaryId = user.primary_email_address_id as string | undefined;
      const emails = (user.email_addresses as any[]) || [];
      if (emails.length) {
        if (primaryId) {
          const match = emails.find((e: any) => e.id === primaryId);
          email = match?.email_address || emails[0]?.email_address;
        } else {
          email = emails[0]?.email_address;
        }
      }
    }
  }

  // 4) Supabase profiles fallback via clerk_user_id
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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");

    const clerkSecret = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecret) throw new Error("Missing CLERK_SECRET_KEY");

    const { email } = await resolveEmailWithFallback(token, clerkSecret);
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

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

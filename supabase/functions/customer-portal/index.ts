import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY");

    const clerkSecret = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecret) throw new Error("Missing CLERK_SECRET_KEY");
    const payload = await verifyToken(token, { secretKey: clerkSecret });

    const email = (payload as any)?.email as string | undefined;
    if (!email) throw new Error("User email not available");

    const customers = await new Stripe(secretKey, { apiVersion: "2023-10-16" }).customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ error: "No Stripe customer found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 });
    }

    const customerId = customers.data[0].id;
    const origin = req.headers.get("origin") || "http://localhost:8080";

    const portal = await new Stripe(secretKey, { apiVersion: "2023-10-16" }).billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });

    return new Response(JSON.stringify({ url: portal.url }), {
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

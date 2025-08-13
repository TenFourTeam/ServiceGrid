import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
  "Vary": "Origin",
};

type ReqBody = {
  invoice_id?: string;
  token?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const origin = req.headers.get("Origin") || req.headers.get("origin") || null;
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (origin && allowed.length && !allowed.includes("*") && !allowed.includes(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const baseUrl = origin ?? (allowed[0] || "https://ijudkzqfriazabiosnvb.supabase.co");

  try {
    const { invoice_id, token }: ReqBody = await req.json();
    if (!invoice_id || !token) {
      return new Response(JSON.stringify({ error: "Missing invoice_id or token" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch invoice with service role (bypass RLS), verify token
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, number, total, status, public_token, owner_id, customer_id, business_id")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      console.error("Invoice fetch error", invErr);
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (invoice.public_token !== token) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (String(invoice.status).toLowerCase() === "paid") {
      return new Response(JSON.stringify({ error: "Invoice already paid" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Optionally fetch customer email to prefill Checkout and vendor account details
    const { data: customer } = await supabase
      .from("customers")
      .select("email, name")
      .eq("id", invoice.customer_id)
      .maybeSingle();

    // Fetch business Stripe Connect info
    const { data: business } = await supabase
      .from("businesses")
      .select("stripe_account_id, application_fee_bps")
      .eq("id", invoice.business_id)
      .maybeSingle();

    const destination = business?.stripe_account_id || null;
    const feeBps = typeof business?.application_fee_bps === "number" ? business.application_fee_bps : 0;
    const amount = invoice.total || 0;
    const applicationFeeAmount = destination && feeBps > 0 ? Math.round((amount * feeBps) / 10000) : undefined;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const paymentIntentData: Record<string, any> = {
      metadata: {
        invoice_id: invoice.id,
        owner_id: invoice.owner_id,
      },
    };
    if (destination) {
      paymentIntentData.transfer_data = { destination };
      if (typeof applicationFeeAmount === "number") {
        paymentIntentData.application_fee_amount = applicationFeeAmount;
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: customer?.email || undefined,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Invoice ${invoice.number}` },
            unit_amount: invoice.total || 0,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment-canceled`,
      payment_intent_data: paymentIntentData,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("create-invoice-payment-public error", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

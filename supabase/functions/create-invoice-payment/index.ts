import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr) throw new Error(userErr.message);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { invoiceId } = await req.json();
    if (!invoiceId) throw new Error("invoiceId is required");

    // Verify invoice belongs to user and get details
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, number, total, owner_id')
      .eq('id', invoiceId)
      .maybeSingle();
    if (invErr) throw new Error(invErr.message);
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.owner_id !== user.id) throw new Error("Not allowed");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

    const origin = req.headers.get("origin") || "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-canceled`,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Invoice ${invoice.number || invoice.id}` },
            unit_amount: invoice.total,
          },
          quantity: 1,
        }
      ],
      metadata: {
        invoice_id: invoice.id,
        owner_id: invoice.owner_id,
      }
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

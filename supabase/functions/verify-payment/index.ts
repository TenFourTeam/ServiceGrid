import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent', 'payment_intent.charges'] });

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const amount = session.amount_total || 0;
    const invoiceId = (session.metadata as any)?.invoice_id as string | undefined;
    const ownerId = (session.metadata as any)?.owner_id as string | undefined;

    if (!invoiceId || !ownerId) throw new Error("Missing invoice metadata");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Insert payment and mark invoice as Paid
    const last4 = (session.payment_intent as any)?.charges?.data?.[0]?.payment_method_details?.card?.last4 || null;

    const { error: payErr } = await supabase.from('payments').insert({
      invoice_id: invoiceId,
      owner_id: ownerId,
      amount: amount,
      method: 'Card',
      status: 'Succeeded',
      received_at: new Date().toISOString(),
      last4,
    });
    if (payErr) throw new Error(payErr.message);

    const { error: invErr } = await supabase.from('invoices').update({ status: 'Paid', paid_at: new Date().toISOString() }).eq('id', invoiceId);
    if (invErr) throw new Error(invErr.message);

    return new Response(JSON.stringify({ status: 'paid' }), {
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

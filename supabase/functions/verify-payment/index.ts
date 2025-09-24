import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
  "Vary": "Origin",
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
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

    const pi = session.payment_intent as any;
    const sessionMeta = (session.metadata || {}) as Record<string, string>;
    const piMeta = (pi?.metadata || {}) as Record<string, string>;
    const invoiceId = (sessionMeta.invoice_id || piMeta.invoice_id) as string | undefined;
    const ownerId = (sessionMeta.owner_id || piMeta.owner_id) as string | undefined;
    const amount =
      (typeof session.amount_total === 'number' ? session.amount_total : 0) ||
      (typeof pi?.amount_received === 'number' ? pi.amount_received : 0);

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

    // Send receipt email via Resend (idempotent)
    let receiptSent = false;
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@servicegrid.app";

      // Fetch invoice, customer, and business info
      const { data: inv, error: invSelErr } = await supabase
        .from('invoices')
        .select('id, number, total, paid_at, customer_id, business_id')
        .eq('id', invoiceId)
        .single();
      if (invSelErr) throw invSelErr;

      const [{ data: cust }, { data: biz }] = await Promise.all([
        supabase.from('customers').select('email, name').eq('id', inv.customer_id).single(),
        supabase.from('businesses').select('name, reply_to_email').eq('id', inv.business_id).single(),
      ]);

      const fallbackEmail = (session.customer_details as any)?.email || (session.customer_email as string | null) || null;
      const toEmail: string | null = cust?.email || fallbackEmail;

      if (resendApiKey && toEmail) {
        // Email functionality temporarily disabled for team management focus
        console.log('Email functionality disabled - receipt not sent');
        receiptSent = false;
      }
    } catch (emailErr) {
      console.error('receipt email error', emailErr);
    }

    return new Response(JSON.stringify({ status: 'paid', receipt_sent: receiptSent }), {
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

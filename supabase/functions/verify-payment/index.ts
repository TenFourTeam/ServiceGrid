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
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'usd',
        }).format((inv.total || 0) / 100);

        const paidDate = inv.paid_at
          ? new Date(inv.paid_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

        const customerName = cust?.name || 'Valued Customer';
        const businessName = biz?.name || 'Our Business';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background-color: #10b981; padding: 32px; text-align: center;">
                        <div style="width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                          <span style="font-size: 24px;">✓</span>
                        </div>
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Payment Received</h1>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px;">
                        <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">Hi ${customerName},</p>
                        <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">Thank you for your payment. This email confirms that we have received your payment.</p>
                        
                        <!-- Payment Details Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                          <tr>
                            <td>
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="color: #6b7280; font-size: 14px;">Invoice Number</span>
                                  </td>
                                  <td style="padding: 8px 0; text-align: right;">
                                    <span style="color: #111827; font-size: 14px; font-weight: 600;">${inv.number}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="color: #6b7280; font-size: 14px;">Amount Paid</span>
                                  </td>
                                  <td style="padding: 8px 0; text-align: right;">
                                    <span style="color: #10b981; font-size: 14px; font-weight: 600;">${formattedAmount}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="color: #6b7280; font-size: 14px;">Payment Date</span>
                                  </td>
                                  <td style="padding: 8px 0; text-align: right;">
                                    <span style="color: #111827; font-size: 14px; font-weight: 600;">${paidDate}</span>
                                  </td>
                                </tr>
                                ${last4 ? `
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="color: #6b7280; font-size: 14px;">Payment Method</span>
                                  </td>
                                  <td style="padding: 8px 0; text-align: right;">
                                    <span style="color: #111827; font-size: 14px; font-weight: 600;">•••• ${last4}</span>
                                  </td>
                                </tr>
                                ` : ''}
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 0;">If you have any questions about this payment, please contact us.</p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">${businessName}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const replyTo = biz?.reply_to_email || undefined;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [toEmail],
            reply_to: replyTo,
            subject: `Payment Receipt - Invoice ${inv.number}`,
            html: emailHtml,
          }),
        });

        if (res.ok) {
          receiptSent = true;
          console.log('Receipt email sent successfully to', toEmail);
        } else {
          const errorText = await res.text();
          console.error('Failed to send receipt email:', errorText);
        }
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

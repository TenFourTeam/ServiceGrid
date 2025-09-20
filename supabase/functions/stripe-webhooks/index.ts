import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error("[stripe-webhooks] Missing signature or webhook secret");
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log("[stripe-webhooks] Processing event:", event.type, "ID:", event.id);

    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[stripe-webhooks] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("[stripe-webhooks] Error processing webhook:", error);
    return new Response(`Webhook error: ${error.message}`, { status: 400 });
  }
});

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("[stripe-webhooks] Processing payment succeeded for invoice:", invoice.id);

  if (!invoice.subscription) {
    console.log("[stripe-webhooks] Invoice not associated with subscription, skipping");
    return;
  }

  // Get subscription details to find the associated quote
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const quoteId = subscription.metadata.quote_id;
  const businessId = subscription.metadata.business_id;
  const customerId = subscription.metadata.customer_id;

  if (!quoteId || !businessId || !customerId) {
    console.error("[stripe-webhooks] Missing metadata in subscription:", subscription.id);
    return;
  }

  console.log("[stripe-webhooks] Found quote ID:", quoteId);

  // Get the original quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (quoteError || !quote) {
    console.error("[stripe-webhooks] Failed to fetch quote:", quoteError);
    return;
  }

  // Create a new invoice for this billing cycle
  const { data: nextInvoiceNumber } = await supabase
    .rpc('next_inv_number', { p_business_id: businessId });

  if (!nextInvoiceNumber) {
    console.error("[stripe-webhooks] Failed to generate invoice number");
    return;
  }

  // Create invoice record
  const { data: newInvoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      owner_id: quote.owner_id,
      business_id: businessId,
      customer_id: customerId,
      quote_id: quoteId,
      number: nextInvoiceNumber,
      tax_rate: quote.tax_rate,
      discount: quote.discount,
      subtotal: quote.subtotal,
      total: quote.total,
      status: 'Paid',
      payment_terms: quote.payment_terms,
      frequency: quote.frequency,
      deposit_required: quote.deposit_required,
      deposit_percent: quote.deposit_percent,
      address: quote.address,
      notes_internal: quote.notes_internal,
      terms: quote.terms,
      paid_at: new Date().toISOString(),
      public_token: crypto.randomUUID()
    })
    .select()
    .single();

  if (invoiceError || !newInvoice) {
    console.error("[stripe-webhooks] Failed to create invoice:", invoiceError);
    return;
  }

  console.log("[stripe-webhooks] Created invoice:", newInvoice.id);

  // Copy line items from quote to invoice
  const { data: quoteLineItems } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quoteId);

  if (quoteLineItems && quoteLineItems.length > 0) {
    const invoiceLineItems = quoteLineItems.map(item => ({
      owner_id: quote.owner_id,
      invoice_id: newInvoice.id,
      name: item.name,
      qty: item.qty,
      unit: item.unit,
      unit_price: item.unit_price,
      line_total: item.line_total,
      position: item.position
    }));

    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(invoiceLineItems);

    if (lineItemsError) {
      console.error("[stripe-webhooks] Failed to create line items:", lineItemsError);
    }
  }

  // Create an unscheduled work order for this billing cycle
  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert({
      owner_id: quote.owner_id,
      business_id: businessId,
      customer_id: customerId,
      quote_id: quoteId,
      parent_quote_id: quoteId,
      title: `${quote.number} - Recurring Service`,
      address: quote.address,
      status: 'Scheduled',
      total: quote.total,
      job_type: 'scheduled',
      is_clocked_in: false,
      is_recurring: true
    })
    .select()
    .single();

  if (jobError) {
    console.error("[stripe-webhooks] Failed to create work order:", jobError);
  } else {
    console.log("[stripe-webhooks] Created work order:", newJob.id);
  }

  // Update recurring schedule next billing date
  const nextBillingDate = new Date(subscription.current_period_end * 1000);
  
  const { error: scheduleError } = await supabase
    .from('recurring_schedules')
    .update({ 
      next_billing_date: nextBillingDate.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (scheduleError) {
    console.error("[stripe-webhooks] Failed to update schedule:", scheduleError);
  }

  console.log("[stripe-webhooks] Payment succeeded processing complete");
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[stripe-webhooks] Processing subscription deleted:", subscription.id);

  // Deactivate the recurring schedule
  const { error } = await supabase
    .from('recurring_schedules')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error("[stripe-webhooks] Failed to deactivate schedule:", error);
  }

  console.log("[stripe-webhooks] Subscription deleted processing complete");
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[stripe-webhooks] Processing payment failed for invoice:", invoice.id);

  // Here you could implement logic to:
  // - Send notification emails
  // - Update customer status
  // - Pause services
  // - Log the failure

  // For now, just log it
  console.log("[stripe-webhooks] Payment failed processing complete");
}
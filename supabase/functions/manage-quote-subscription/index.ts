import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { userId, supaAdmin: supabase } = await requireCtx(req);
    const { quoteId } = await req.json();

    console.log("[manage-quote-subscription] Processing quote:", quoteId);

    if (!quoteId) {
      return json({ error: "Quote ID is required" }, { status: 400 });
    }

    // Get the quote details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customers (
          id,
          name,
          email
        ),
        businesses (
          id,
          name,
          stripe_account_id
        )
      `)
      .eq('id', quoteId)
      .eq('owner_id', userId)
      .single();

    if (quoteError) {
      console.error("[manage-quote-subscription] Quote fetch error:", quoteError);
      return json({ error: "Quote not found" }, { status: 404 });
    }

    if (!quote.is_subscription) {
      return json({ error: "Quote is not a subscription" }, { status: 400 });
    }

    // Check if customer already has an active subscription for this business
    const { data: activeSubscription, error: activeSubError } = await supabase.rpc(
      'has_active_subscription',
      {
        p_customer_id: quote.customers.id,
        p_business_id: quote.businesses.id
      }
    );

    if (activeSubError) {
      console.error("[manage-quote-subscription] Active subscription check error:", activeSubError);
      return json({ error: "Failed to check existing subscriptions" }, { status: 500 });
    }

    if (activeSubscription) {
      console.log("[manage-quote-subscription] Customer already has active subscription");
      return json({ error: "Customer already has an active subscription for this business" }, { status: 400 });
    }

    console.log("[manage-quote-subscription] Quote found:", {
      id: quote.id,
      isSubscription: quote.is_subscription,
      frequency: quote.frequency,
      total: quote.total
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create or get Stripe customer
    let stripeCustomer;
    const existingCustomers = await stripe.customers.list({
      email: quote.customers.email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
      console.log("[manage-quote-subscription] Using existing Stripe customer:", stripeCustomer.id);
    } else {
      stripeCustomer = await stripe.customers.create({
        email: quote.customers.email,
        name: quote.customers.name,
        metadata: {
          customer_id: quote.customers.id,
          business_id: quote.businesses.id
        }
      });
      console.log("[manage-quote-subscription] Created new Stripe customer:", stripeCustomer.id);
    }

    // Map quote frequency to Stripe interval
    const intervalMap: Record<string, { interval: string; interval_count: number }> = {
      'bi-monthly': { interval: 'month', interval_count: 2 },
      'monthly': { interval: 'month', interval_count: 1 },
      'bi-yearly': { interval: 'month', interval_count: 6 },
      'yearly': { interval: 'year', interval_count: 1 }
    };

    const billingConfig = intervalMap[quote.frequency || 'monthly'];
    if (!billingConfig) {
      return json({ error: "Invalid frequency for subscription" }, { status: 400 });
    }

    // Create Stripe product
    const product = await stripe.products.create({
      name: `${quote.businesses.name} - Quote ${quote.number}`,
      description: quote.address ? `Service for ${quote.address}` : 'Recurring service',
      metadata: {
        quote_id: quote.id,
        business_id: quote.businesses.id
      }
    });

    console.log("[manage-quote-subscription] Created Stripe product:", product.id);

    // Create Stripe price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: quote.total,
      currency: 'usd',
      recurring: {
        interval: billingConfig.interval as 'month' | 'year',
        interval_count: billingConfig.interval_count,
      },
      metadata: {
        quote_id: quote.id,
        frequency: quote.frequency
      }
    });

    console.log("[manage-quote-subscription] Created Stripe price:", price.id);

    // Create Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [{ price: price.id }],
      metadata: {
        quote_id: quote.id,
        business_id: quote.businesses.id,
        customer_id: quote.customers.id
      },
      // Start the subscription immediately
      billing_cycle_anchor: Math.floor(Date.now() / 1000)
    });

    console.log("[manage-quote-subscription] Created Stripe subscription:", subscription.id);

    // Calculate next billing date
    const nextBillingDate = new Date(subscription.current_period_end * 1000);

    // Update quote with subscription ID
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ stripe_subscription_id: subscription.id })
      .eq('id', quoteId);

    if (updateError) {
      console.error("[manage-quote-subscription] Quote update error:", updateError);
      // Don't fail the request, just log the error
    }

    // Create recurring schedule record
    const { error: scheduleError } = await supabase
      .from('recurring_schedules')
      .insert({
        quote_id: quoteId,
        business_id: quote.businesses.id,
        customer_id: quote.customers.id,
        frequency: quote.frequency,
        next_billing_date: nextBillingDate.toISOString(),
        stripe_subscription_id: subscription.id,
        is_active: true
      });

    if (scheduleError) {
      console.error("[manage-quote-subscription] Schedule creation error:", scheduleError);
      // Don't fail the request, just log the error
    }

    console.log("[manage-quote-subscription] Subscription created successfully");

    return json({
      success: true,
      subscriptionId: subscription.id,
      customerId: stripeCustomer.id,
      nextBillingDate: nextBillingDate.toISOString()
    });

  } catch (error) {
    console.error("[manage-quote-subscription] Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: msg }, { status: 500 });
  }
});
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, supaAdmin: supabase } = await requireCtx(req);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // GET - Check subscription status or get portal link
    if (req.method === "GET") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");

      if (action === "portal_link") {
        const customers = await stripe.customers.list({ email, limit: 1 });
        let customerId: string;

        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const created = await stripe.customers.create({ email });
          customerId = created.id;
        }

        const origin = req.headers.get("origin") || "http://localhost:8080";
        const portal = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${origin}/settings`,
        });

        return json({ url: portal.url });
      }

      if (action === "check_customer_subscription") {
        const { customerId, businessId } = await req.json().catch(() => ({}));

        if (!customerId || !businessId) {
          return json({ error: "Missing required parameters" }, { status: 400 });
        }

        const { data: hasAccess } = await supabase
          .rpc("is_business_member", { p_business_id: businessId });

        if (!hasAccess) {
          return json({ error: "Access denied" }, { status: 403 });
        }

        const { data: subscriptions } = await supabase
          .from("recurring_schedules")
          .select("id, stripe_subscription_id")
          .eq("customer_id", customerId)
          .eq("business_id", businessId)
          .eq("is_active", true)
          .limit(1);

        const hasActiveSubscription = subscriptions && subscriptions.length > 0;

        return json({
          hasActiveSubscription,
          subscriptionId: hasActiveSubscription ? subscriptions[0].stripe_subscription_id : null,
        });
      }

      // Default: Check user subscription
      const customers = await stripe.customers.list({ email, limit: 1 });
      let customerId: string | null = null;

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }

      let subscribed = false;
      let subscription_tier = null;
      let subscription_end = null;

      if (customerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          subscribed = true;
          subscription_tier = sub.items.data[0]?.price?.recurring?.interval || "monthly";
          subscription_end = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        }
      }

      // Upsert subscriber record
      await supabase
        .from("subscribers")
        .upsert({
          user_id: userId,
          email,
          subscribed,
          subscription_tier,
          subscription_end,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      return json({
        subscribed,
        subscription_tier,
        subscription_end,
      });
    }

    // POST - Create checkout or manage quote subscription
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const action = body.action;

      if (action === "create_checkout") {
        const plan = body.plan || "monthly";
        const customers = await stripe.customers.list({ email, limit: 1 });
        const customerId = customers.data[0]?.id;

        const unitAmount = plan === "yearly" ? 50400 : 5000;
        const interval = plan === "yearly" ? "year" : "month";
        const origin = req.headers.get("origin") || "http://localhost:8080";

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          customer_email: customerId ? undefined : email,
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: { name: plan === "yearly" ? "Pro Yearly" : "Pro Monthly" },
              unit_amount: unitAmount,
              recurring: { interval },
            },
            quantity: 1,
          }],
          mode: "subscription",
          allow_promotion_codes: true,
          subscription_data: { trial_period_days: 7 },
          success_url: `${origin}/settings?checkout=success`,
          cancel_url: `${origin}/settings?checkout=canceled`,
        });

        return json({ url: session.url });
      }

      if (action === "manage_quote_subscription") {
        const { quoteId } = body;
        if (!quoteId) {
          return json({ error: "quoteId is required" }, { status: 400 });
        }

        const { data: quote, error: quoteErr } = await supabase
          .from("quotes")
          .select(`
            id, total, frequency, business_id, customer_id,
            customers (email, name)
          `)
          .eq("id", quoteId)
          .single();

        if (quoteErr || !quote) {
          return json({ error: "Quote not found" }, { status: 404 });
        }

        if (!quote.frequency) {
          return json({ error: "Quote is not a subscription" }, { status: 400 });
        }

        const customerEmail = quote.customers?.email;
        if (!customerEmail) {
          return json({ error: "Customer email not found" }, { status: 400 });
        }

        let stripeCustomer = await stripe.customers.list({ email: customerEmail, limit: 1 });
        let customerId: string;

        if (stripeCustomer.data.length > 0) {
          customerId = stripeCustomer.data[0].id;
        } else {
          const created = await stripe.customers.create({
            email: customerEmail,
            name: quote.customers?.name,
          });
          customerId = created.id;
        }

        // Map frontend frequency names to Stripe intervals
        const frequencyToStripeMap: Record<string, { interval: "day" | "week" | "month" | "year", count: number }> = {
          'weekly': { interval: 'week', count: 1 },
          'bi-monthly': { interval: 'week', count: 2 },
          'monthly': { interval: 'month', count: 1 },
          'quarterly': { interval: 'month', count: 3 },
          'bi-yearly': { interval: 'month', count: 6 },
          'yearly': { interval: 'year', count: 1 },
          
          // Legacy capitalized versions for backward compatibility
          'Weekly': { interval: 'week', count: 1 },
          'Monthly': { interval: 'month', count: 1 },
          'Quarterly': { interval: 'month', count: 3 },
          'Yearly': { interval: 'year', count: 1 },
        };

        const stripeConfig = frequencyToStripeMap[quote.frequency] || { interval: 'month', count: 1 };

        const product = await stripe.products.create({
          name: `Subscription for Quote ${quote.id}`,
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: quote.total,
          currency: "usd",
          recurring: { 
            interval: stripeConfig.interval, 
            interval_count: stripeConfig.count 
          },
        });

        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: price.id }],
          metadata: {
            quote_id: quote.id,
            business_id: quote.business_id,
            customer_id: quote.customer_id,
          },
        });

        await supabase
          .from("quotes")
          .update({ stripe_subscription_id: subscription.id })
          .eq("id", quote.id);

        const nextBillingDate = new Date(subscription.current_period_end * 1000);

        await supabase
          .from("recurring_schedules")
          .insert({
            quote_id: quote.id,
            business_id: quote.business_id,
            customer_id: quote.customer_id,
            frequency: quote.frequency,
            next_billing_date: nextBillingDate.toISOString(),
            stripe_subscription_id: subscription.id,
            is_active: true,
          });

        return json({
          success: true,
          subscription_id: subscription.id,
          customer_id: customerId,
          next_billing_date: nextBillingDate.toISOString(),
        });
      }

      return json({ error: "Unknown action" }, { status: 400 });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[subscriptions-crud] error:", msg);
    return json({ error: msg }, { status: 500 });
  }
});

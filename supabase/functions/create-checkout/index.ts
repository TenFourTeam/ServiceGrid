import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await requireCtx(req);

    const body = await req.json().catch(() => ({}));
    const plan = (body?.plan as string) || "monthly"; // 'monthly' | 'yearly'
    const tier = (body?.tier as string) || "pro"; // 'basic' | 'pro'

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data[0]?.id;

    // Define pricing based on tier
    let unitAmount: number;
    let productName: string;

    if (tier === "basic") {
      unitAmount = plan === "yearly" ? 24000 : 2500; // $240/yr or $25/mo
      productName = plan === "yearly" ? "Basic Yearly" : "Basic Monthly";
    } else {
      unitAmount = plan === "yearly" ? 48000 : 5000; // $480/yr or $50/mo
      productName = plan === "yearly" ? "Pro Yearly" : "Pro Monthly";
    }

    const interval = plan === "yearly" ? "year" : "month";

    const origin = req.headers.get("origin") || "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: productName },
            unit_amount: unitAmount,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 },
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=canceled`,
    });

    return json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: msg }, { status: 500 });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Customer payment methods management (public endpoint with session auth)
    if (action === "list_payment_methods" || action === "delete_payment_method") {
      const origin = req.headers.get("origin") || "";
      if (!ALLOWED_ORIGINS.includes(origin)) {
        return json({ error: "Origin not allowed" }, { status: 403 });
      }

      const { userId: _ignored, supaAdmin: supabase } = await requireCtx(req);

      // Get customer session from header
      const sessionToken = req.headers.get("x-customer-session");
      if (!sessionToken) {
        return json({ error: "Missing session token" }, { status: 401 });
      }

      // Validate session and get customer account
      const { data: session, error: sessionError } = await supabase
        .from("customer_sessions")
        .select(`
          id, expires_at, customer_account_id,
          customer_accounts!inner(id, stripe_customer_id, email)
        `)
        .eq("session_token", sessionToken)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (sessionError || !session) {
        return json({ error: "Invalid or expired session" }, { status: 401 });
      }

      const stripeCustomerId = session.customer_accounts?.stripe_customer_id;
      if (!stripeCustomerId) {
        // No Stripe customer = no saved payment methods
        return json({ paymentMethods: [] });
      }

      if (action === "list_payment_methods") {
        // List all payment methods for this customer
        const paymentMethods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: "card",
        });

        const formattedMethods = paymentMethods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand || "unknown",
          last4: pm.card?.last4 || "****",
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          isDefault: false, // Could check customer's default_payment_method
        }));

        return json({ paymentMethods: formattedMethods });
      }

      if (action === "delete_payment_method") {
        const { payment_method_id } = await req.json();
        if (!payment_method_id) {
          return json({ error: "Missing payment_method_id" }, { status: 400 });
        }

        // Verify the payment method belongs to this customer
        const pm = await stripe.paymentMethods.retrieve(payment_method_id);
        if (pm.customer !== stripeCustomerId) {
          return json({ error: "Payment method not found" }, { status: 404 });
        }

        // Detach the payment method
        await stripe.paymentMethods.detach(payment_method_id);

        console.log(`[payments-crud] Deleted payment method ${payment_method_id} for customer ${stripeCustomerId}`);
        return json({ success: true });
      }
    }

    // Public endpoints for invoice payments
    if (action === "create_public_checkout" || action === "verify_payment" || action === "create_embedded_checkout") {
      const origin = req.headers.get("origin") || "";
      if (!ALLOWED_ORIGINS.includes(origin)) {
        return json({ error: "Origin not allowed" }, { status: 403 });
      }

      const { userId: _ignored, supaAdmin: supabase } = await requireCtx(req);

      if (action === "create_public_checkout") {
        const { invoice_id, token } = await req.json();
        if (!invoice_id || !token) {
          return json({ error: "Missing invoice_id or token" }, { status: 400 });
        }

        const { data: invoice, error: invErr } = await supabase
          .from("invoices")
          .select(`
            id, number, total, status, business_id, customer_id, public_token,
            customers (email, name),
            businesses (stripe_account_id, application_fee_bps)
          `)
          .eq("id", invoice_id)
          .maybeSingle();

        if (invErr || !invoice) {
          return json({ error: "Invoice not found" }, { status: 404 });
        }

        if (invoice.public_token !== token) {
          return json({ error: "Invalid token" }, { status: 403 });
        }

        if (invoice.status === "Paid") {
          return json({ error: "Invoice already paid" }, { status: 400 });
        }

        const checkoutOrigin = origin || "http://localhost:8080";
        const sessionConfig: any = {
          mode: "payment",
          success_url: `${checkoutOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${checkoutOrigin}/payment-canceled`,
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: { name: `Invoice ${invoice.number || invoice.id}` },
              unit_amount: invoice.total,
            },
            quantity: 1,
          }],
          metadata: {
            invoice_id: invoice.id,
            owner_id: invoice.customer_id,
          },
        };

        if (invoice.customers?.email) {
          sessionConfig.customer_email = invoice.customers.email;
        }

        if (invoice.businesses?.stripe_account_id) {
          const applicationFee = Math.floor((invoice.total * (invoice.businesses.application_fee_bps || 0)) / 10000);
          sessionConfig.payment_intent_data = {
            application_fee_amount: applicationFee,
            transfer_data: {
              destination: invoice.businesses.stripe_account_id,
            },
          };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);
        return json({ url: session.url });
      }

      // Embedded checkout for in-portal payments (with saved payment methods)
      if (action === "create_embedded_checkout") {
        const { invoice_id, token } = await req.json();
        if (!invoice_id || !token) {
          return json({ error: "Missing invoice_id or token" }, { status: 400 });
        }

        const { data: invoice, error: invErr } = await supabase
          .from("invoices")
          .select(`
            id, number, total, status, business_id, customer_id, public_token,
            customers (id, email, name),
            businesses (stripe_account_id, application_fee_bps)
          `)
          .eq("id", invoice_id)
          .maybeSingle();

        if (invErr || !invoice) {
          return json({ error: "Invoice not found" }, { status: 404 });
        }

        if (invoice.public_token !== token) {
          return json({ error: "Invalid token" }, { status: 403 });
        }

        if (invoice.status === "Paid") {
          return json({ error: "Invoice already paid" }, { status: 400 });
        }

        // Look up or create Stripe customer for saved payment methods
        let stripeCustomerId: string | null = null;
        
        // Get customer account to check for existing Stripe customer
        const { data: customerAccount } = await supabase
          .from("customer_accounts")
          .select("id, stripe_customer_id")
          .eq("customer_id", invoice.customer_id)
          .maybeSingle();

        if (customerAccount?.stripe_customer_id) {
          // Use existing Stripe customer
          stripeCustomerId = customerAccount.stripe_customer_id;
          console.log(`[payments-crud] Using existing Stripe customer: ${stripeCustomerId}`);
        } else if (customerAccount && invoice.customers?.email) {
          // Create new Stripe customer
          try {
            const stripeCustomer = await stripe.customers.create({
              email: invoice.customers.email,
              name: invoice.customers.name || undefined,
              metadata: {
                customer_account_id: customerAccount.id,
                customer_id: invoice.customer_id,
              },
            });
            stripeCustomerId = stripeCustomer.id;
            
            // Save Stripe customer ID to database
            await supabase
              .from("customer_accounts")
              .update({ stripe_customer_id: stripeCustomerId })
              .eq("id", customerAccount.id);
            
            console.log(`[payments-crud] Created new Stripe customer: ${stripeCustomerId}`);
          } catch (stripeErr) {
            console.error("[payments-crud] Failed to create Stripe customer:", stripeErr);
            // Continue without saved payment methods
          }
        }

        const checkoutOrigin = origin || "http://localhost:8080";
        const embeddedConfig: any = {
          ui_mode: "embedded",
          mode: "payment",
          return_url: `${checkoutOrigin}/portal?payment_status=complete&session_id={CHECKOUT_SESSION_ID}`,
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: { name: `Invoice ${invoice.number || invoice.id}` },
              unit_amount: invoice.total,
            },
            quantity: 1,
          }],
          metadata: {
            invoice_id: invoice.id,
            owner_id: invoice.customer_id,
          },
        };

        // If we have a Stripe customer, enable saved payment methods
        if (stripeCustomerId) {
          embeddedConfig.customer = stripeCustomerId;
          embeddedConfig.payment_method_collection = "always";
          embeddedConfig.saved_payment_method_options = {
            payment_method_save: "enabled",
          };
        } else if (invoice.customers?.email) {
          // Fallback to customer_email if no Stripe customer
          embeddedConfig.customer_email = invoice.customers.email;
        }

        if (invoice.businesses?.stripe_account_id) {
          const applicationFee = Math.floor((invoice.total * (invoice.businesses.application_fee_bps || 0)) / 10000);
          embeddedConfig.payment_intent_data = {
            application_fee_amount: applicationFee,
            transfer_data: {
              destination: invoice.businesses.stripe_account_id,
            },
          };
        }

        const embeddedSession = await stripe.checkout.sessions.create(embeddedConfig);
        return json({ clientSecret: embeddedSession.client_secret });
      }

      if (action === "verify_payment") {
        const { session_id } = await req.json();
        if (!session_id) {
          return json({ error: "Missing session_id" }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);
        const invoiceId = session.metadata?.invoice_id;

        if (!invoiceId) {
          return json({ error: "No invoice_id in session metadata" }, { status: 400 });
        }

        const { data: invoice } = await supabase
          .from("invoices")
          .select("id, status, owner_id")
          .eq("id", invoiceId)
          .maybeSingle();

        if (!invoice) {
          return json({ error: "Invoice not found" }, { status: 404 });
        }

        if (session.payment_status === "paid" && invoice.status !== "Paid") {
          const paymentIntentId = session.payment_intent as string;
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          const charge = paymentIntent.latest_charge
            ? await stripe.charges.retrieve(paymentIntent.latest_charge as string)
            : null;

          await supabase.from("payments").insert({
            owner_id: invoice.owner_id,
            invoice_id: invoiceId,
            amount: session.amount_total || 0,
            method: charge?.payment_method_details?.type || "card",
            status: "completed",
            received_at: new Date().toISOString(),
            last4: charge?.payment_method_details?.card?.last4,
          });

          await supabase
            .from("invoices")
            .update({ status: "Paid", paid_at: new Date().toISOString() })
            .eq("id", invoiceId);

          return json({ status: "paid", invoice_id: invoiceId });
        }

        return json({ status: session.payment_status, invoice_id: invoiceId });
      }
    }

    // Authenticated endpoints
    const { userId, supaAdmin: supabase } = await requireCtx(req);

    // GET - Get payments for invoice
    if (req.method === "GET") {
      const invoiceId = url.searchParams.get("invoiceId");
      if (!invoiceId) {
        return json({ error: "Missing invoiceId" }, { status: 400 });
      }

      const { data: payments, error: payErr } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("received_at", { ascending: false });

      if (payErr) {
        return json({ error: payErr.message }, { status: 500 });
      }

      return json({ payments: payments || [] });
    }

    // POST - Create checkout or record payment
    if (req.method === "POST") {
      const body = await req.json();
      const postAction = body.action;

      if (postAction === "create_checkout") {
        const { invoiceId } = body;
        if (!invoiceId) {
          return json({ error: "invoiceId is required" }, { status: 400 });
        }

        const { data: invoice, error: invErr } = await supabase
          .from("invoices")
          .select("id, number, total, owner_id")
          .eq("id", invoiceId)
          .maybeSingle();

        if (invErr || !invoice) {
          return json({ error: "Invoice not found" }, { status: 404 });
        }

        if (invoice.owner_id !== userId) {
          return json({ error: "Not allowed" }, { status: 403 });
        }

        const origin = req.headers.get("origin") || "http://localhost:8080";
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/payment-canceled`,
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: { name: `Invoice ${invoice.number || invoice.id}` },
              unit_amount: invoice.total,
            },
            quantity: 1,
          }],
          metadata: {
            invoice_id: invoice.id,
            owner_id: invoice.owner_id,
          },
        });

        return json({ url: session.url });
      }

      if (postAction === "record_payment") {
        const { invoiceId, amount, method, receivedAt, last4 } = body;

        const { data: invoice } = await supabase
          .from("invoices")
          .select("business_id")
          .eq("id", invoiceId)
          .maybeSingle();

        if (!invoice) {
          return json({ error: "Invoice not found" }, { status: 404 });
        }

        const { data: canManage } = await supabase.rpc("can_manage_business", {
          p_business_id: invoice.business_id,
        });

        if (!canManage) {
          return json({ error: "Not authorized" }, { status: 403 });
        }

        const { data: payment, error: payErr } = await supabase
          .from("payments")
          .insert({
            owner_id: userId,
            invoice_id: invoiceId,
            amount,
            method: method || "Cash",
            status: "completed",
            received_at: receivedAt || new Date().toISOString(),
            last4: last4 || null,
          })
          .select()
          .single();

        if (payErr) {
          return json({ error: payErr.message }, { status: 500 });
        }

        return json({ payment });
      }

      return json({ error: "Unknown action" }, { status: 400 });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[payments-crud] error:", msg);
    return json({ error: msg }, { status: 500 });
  }
});

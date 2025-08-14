import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { userId: profileId, businessId, supaAdmin: supabase } = ctx;

    // Batch all data queries
    const [businessResult, dashboardResult, quotesResult, stripeResult, subscriptionResult] = await Promise.all([
      // Get business data
      supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", profileId)
        .order("created_at")
        .limit(1)
        .maybeSingle(),

      // Get counts and data using the custom function
      supabase.rpc('get_dashboard_counts', { owner_id: profileId }),

      // Get quotes data
      supabase
        .from("quotes")
        .select(`
          id, number, total, status, updated_at, view_count, public_token,
          customer_id, customers(name, email)
        `)
        .eq("owner_id", profileId)
        .order("updated_at", { ascending: false }),

      // Get Stripe status
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/connect-account-status`, {
        headers: { Authorization: req.headers.get("authorization") || "" },
      }).then(res => res.ok ? res.json() : { chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false }),

      // Get subscription status
      supabase
        .from("subscribers")
        .select("subscribed, subscription_tier, subscription_end")
        .eq("user_id", profileId)
        .maybeSingle()
    ]);

    // Handle business data or create default
    let business = businessResult.data;
    if (!business) {
      const { data: newBusiness } = await supabase
        .from("businesses")
        .insert({ owner_id: profileId, name: "My Business" })
        .select()
        .single();
      business = newBusiness;
    }

    // Prepare response data
    const dashboardData = {
      business: {
        id: business.id,
        name: business.name,
        phone: business.phone,
        reply_to_email: business.reply_to_email,
        logo_url: business.logo_url,
        light_logo_url: business.light_logo_url,
        tax_rate_default: Number(business.tax_rate_default) || 0,
        est_prefix: business.est_prefix,
        est_seq: Number(business.est_seq) || 1,
        inv_prefix: business.inv_prefix,
        inv_seq: Number(business.inv_seq) || 1,
      },
      counts: {
        customers: Number(dashboardResult.data?.customers || 0),
        jobs: Number(dashboardResult.data?.jobs || 0),
        quotes: Number(dashboardResult.data?.quotes || 0)
      },
      customers: dashboardResult.data?.customer_data || [],
      invoices: dashboardResult.data?.invoice_data || [],
      quotes: quotesResult.data || [],
      stripeStatus: stripeResult,
      subscription: {
        subscribed: subscriptionResult.data?.subscribed || false,
        tier: subscriptionResult.data?.subscription_tier,
        endDate: subscriptionResult.data?.subscription_end,
      }
    };

    return json(dashboardData);

  } catch (e) {
    console.error("Dashboard data error:", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
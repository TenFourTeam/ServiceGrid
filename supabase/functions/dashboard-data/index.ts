import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

function withCors(headers: HeadersInit = {}) {
  return { ...corsHeaders, ...(headers as Record<string, string>) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: withCors() });
  }

  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401,
        headers: withCors({ "Content-Type": "application/json" }),
      });
    }

    const token = auth.split(" ")[1];
    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Missing CLERK_SECRET_KEY" }), {
        status: 500,
        headers: withCors({ "Content-Type": "application/json" }),
      });
    }

    // Verify Clerk token
    const payload = await verifyToken(token, { secretKey });
    const clerkUserId = (payload as any)?.sub as string | undefined;
    if (!clerkUserId) {
      return new Response(JSON.stringify({ error: "Invalid Clerk token" }), {
        status: 401,
        headers: withCors({ "Content-Type": "application/json" }),
      });
    }

    // Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase config" }), {
        status: 500,
        headers: withCors({ "Content-Type": "application/json" }),
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get profile mapping
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (!profile?.id) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: withCors({ "Content-Type": "application/json" }),
      });
    }

    const profileId = profile.id;

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
        headers: { Authorization: `Bearer ${token}` },
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

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: withCors({ "Content-Type": "application/json" }),
    });

  } catch (e) {
    console.error("Dashboard data error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: withCors({ "Content-Type": "application/json" }),
    });
  }
});
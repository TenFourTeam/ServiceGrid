import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user and get context
    const { userId, supaAdmin: supabase } = await requireCtx(req);

    const { customerId, businessId } = await req.json();

    if (!customerId || !businessId) {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify user has access to this business
    const { data: membership } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Check for active subscription
    const { data: subscriptions, error } = await supabase
      .from('recurring_schedules')
      .select('id, stripe_subscription_id')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error('Error checking subscription status:', error);
      return json({ error: 'Database error' }, { status: 500 });
    }

    const hasActiveSubscription = subscriptions && subscriptions.length > 0;

    return json({ 
      hasActiveSubscription,
      subscriptionId: hasActiveSubscription ? subscriptions[0].stripe_subscription_id : null
    });

  } catch (error) {
    console.error('Error in check-subscription-status function:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
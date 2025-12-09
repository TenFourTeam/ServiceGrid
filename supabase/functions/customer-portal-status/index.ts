import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCtx } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const ctx = await requireCtx(req);
    
    const url = new URL(req.url);
    const customerId = url.searchParams.get('customerId');

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'customerId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if customer belongs to this business
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', customerId)
      .eq('business_id', ctx.businessId)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for customer account (portal access)
    const { data: account } = await supabase
      .from('customer_accounts')
      .select('id, last_login_at, created_at')
      .eq('customer_id', customerId)
      .single();

    // Check for pending invite
    const { data: invite } = await supabase
      .from('customer_portal_invites')
      .select('id, sent_at, accepted_at, expires_at')
      .eq('customer_id', customerId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const hasAccount = !!account;
    const hasPendingInvite = !!invite;

    let status: 'active' | 'pending' | 'none' = 'none';
    if (hasAccount) {
      status = 'active';
    } else if (hasPendingInvite) {
      status = 'pending';
    }

    return new Response(
      JSON.stringify({
        status,
        hasAccount,
        hasPendingInvite,
        inviteSentAt: invite?.sent_at,
        lastLoginAt: account?.last_login_at,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in customer-portal-status:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

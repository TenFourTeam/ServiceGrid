import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const sessionToken = req.headers.get('x-session-token');
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session and get customer account
    const { data: session, error: sessionError } = await supabase
      .from('customer_sessions')
      .select('id, customer_account_id')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    
    if (req.method === 'GET') {
      // Get list of available businesses for this customer account
      const { data: links, error: linksError } = await supabase
        .from('customer_account_links')
        .select(`
          id,
          customer_id,
          business_id,
          is_primary,
          customers (id, name, email),
          businesses (id, name, logo_url, light_logo_url)
        `)
        .eq('customer_account_id', session.customer_account_id);

      if (linksError) {
        console.error('Error fetching customer links:', linksError);
        throw linksError;
      }

      // Get current active business from session
      const { data: currentSession } = await supabase
        .from('customer_sessions')
        .select('active_customer_id, active_business_id')
        .eq('id', session.id)
        .single();

      const businesses = (links || []).map(link => ({
        id: link.business_id,
        name: link.businesses?.name || 'Unknown Business',
        logo_url: link.businesses?.logo_url,
        light_logo_url: link.businesses?.light_logo_url,
        customer_id: link.customer_id,
        customer_name: link.customers?.name,
        is_primary: link.is_primary,
      }));

      let activeBusinessId = currentSession?.active_business_id;
      let activeCustomerId = currentSession?.active_customer_id;

      // Auto-initialize context if NULL and businesses are available
      if ((!activeBusinessId || !activeCustomerId) && businesses.length > 0) {
        // Prioritize invited (non-primary) businesses over customer's own business
        const invited = businesses.find(b => !b.is_primary);
        const selected = invited || businesses.find(b => b.is_primary) || businesses[0];
        
        activeBusinessId = selected.id;
        activeCustomerId = selected.customer_id;

        console.log(`[customer-switch-business] Auto-initializing context: business=${activeBusinessId}, customer=${activeCustomerId}`);

        // Update session with the selected context
        const { error: updateError } = await supabase
          .from('customer_sessions')
          .update({
            active_business_id: activeBusinessId,
            active_customer_id: activeCustomerId,
          })
          .eq('id', session.id);

        if (updateError) {
          console.error('[customer-switch-business] Failed to auto-initialize context:', updateError);
        }
      }

      return new Response(
        JSON.stringify({
          businesses,
          active_business_id: activeBusinessId,
          active_customer_id: activeCustomerId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const { business_id } = await req.json();

      if (!business_id) {
        return new Response(
          JSON.stringify({ error: 'business_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify customer has access to this business
      const { data: link, error: linkError } = await supabase
        .from('customer_account_links')
        .select(`
          customer_id,
          business_id,
          customers (id, name, email, phone, address),
          businesses (id, name, logo_url, light_logo_url, phone, reply_to_email)
        `)
        .eq('customer_account_id', session.customer_account_id)
        .eq('business_id', business_id)
        .single();

      if (linkError || !link) {
        return new Response(
          JSON.stringify({ error: 'You do not have access to this business' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update session with new active business/customer
      const { error: updateError } = await supabase
        .from('customer_sessions')
        .update({
          active_customer_id: link.customer_id,
          active_business_id: link.business_id,
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Error updating session:', updateError);
        throw updateError;
      }

      console.log(`[customer-switch-business] Switched to business ${business_id} for session ${session.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          active_business_id: link.business_id,
          active_customer_id: link.customer_id,
          customer: link.customers,
          business: link.businesses,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Customer switch business error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

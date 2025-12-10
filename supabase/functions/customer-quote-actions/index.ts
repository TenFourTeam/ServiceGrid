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
    // Authenticate customer via session token
    const sessionToken = req.headers.get('x-session-token');
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('customer_sessions')
      .select('*, customer_accounts(*, customers(id, name, email, phone, address, business_id))')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.error('Session validation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = session.customer_accounts.customers.id;
    const businessId = session.customer_accounts.customers.business_id;
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const quoteId = url.searchParams.get('quoteId');
      
      if (!quoteId) {
        return new Response(
          JSON.stringify({ error: 'Quote ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch quote with line items
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          id, number, status, total, subtotal, tax_rate, discount,
          address, terms, deposit_required, deposit_percent,
          payment_terms, frequency, created_at, sent_at, approved_at,
          public_token, customer_notes, notes_internal,
          quote_line_items(id, name, qty, unit, unit_price, line_total, position)
        `)
        .eq('id', quoteId)
        .eq('customer_id', customerId)
        .single();

      if (quoteError || !quote) {
        console.error('Quote fetch error:', quoteError);
        return new Response(
          JSON.stringify({ error: 'Quote not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get business info for branding
      const { data: business } = await supabase
        .from('businesses')
        .select('id, name, logo_url, light_logo_url, phone, reply_to_email')
        .eq('id', businessId)
        .single();

      // Get customer name
      const customerName = session.customer_accounts.customers.name;

      return new Response(
        JSON.stringify({ 
          quote,
          business,
          customerName
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, quoteId, signature, notes } = body;

      if (!quoteId || !action) {
        return new Response(
          JSON.stringify({ error: 'Quote ID and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify quote belongs to customer
      const { data: quote, error: verifyError } = await supabase
        .from('quotes')
        .select('id, status, public_token')
        .eq('id', quoteId)
        .eq('customer_id', customerId)
        .single();

      if (verifyError || !quote) {
        console.error('Quote verification error:', verifyError);
        return new Response(
          JSON.stringify({ error: 'Quote not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle different actions
      switch (action) {
        case 'accept': {
          if (!signature) {
            return new Response(
              JSON.stringify({ error: 'Signature is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const customerName = session.customer_accounts.customers.name;
          
          const { error: updateError } = await supabase
            .from('quotes')
            .update({
              status: 'Approved',
              approved_at: new Date().toISOString(),
              approved_by: customerName,
            })
            .eq('id', quoteId);

          if (updateError) {
            console.error('Quote accept error:', updateError);
            throw updateError;
          }

          console.log(`Quote ${quoteId} accepted by customer ${customerId}`);
          
          return new Response(
            JSON.stringify({ success: true, status: 'Approved' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'decline': {
          const { error: updateError } = await supabase
            .from('quotes')
            .update({
              status: 'Declined',
            })
            .eq('id', quoteId);

          if (updateError) {
            console.error('Quote decline error:', updateError);
            throw updateError;
          }

          console.log(`Quote ${quoteId} declined by customer ${customerId}`);
          
          return new Response(
            JSON.stringify({ success: true, status: 'Declined' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'request_changes': {
          if (!notes) {
            return new Response(
              JSON.stringify({ error: 'Notes are required for change requests' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { error: updateError } = await supabase
            .from('quotes')
            .update({
              status: 'Edits Requested',
              customer_notes: notes,
            })
            .eq('id', quoteId);

          if (updateError) {
            console.error('Quote change request error:', updateError);
            throw updateError;
          }

          console.log(`Quote ${quoteId} change requested by customer ${customerId}`);
          
          return new Response(
            JSON.stringify({ success: true, status: 'Edits Requested' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Customer quote actions error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
      const invoiceId = url.searchParams.get('invoiceId');
      
      if (!invoiceId) {
        return new Response(
          JSON.stringify({ error: 'Invoice ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch invoice with line items
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id, number, status, total, subtotal, tax_rate, discount,
          address, terms, deposit_required, deposit_percent,
          payment_terms, frequency, created_at, due_at, paid_at,
          public_token, notes_internal,
          job_id, quote_id,
          invoice_line_items(id, name, qty, unit, unit_price, line_total, position)
        `)
        .eq('id', invoiceId)
        .eq('customer_id', customerId)
        .single();

      if (invoiceError || !invoice) {
        console.error('Invoice fetch error:', invoiceError);
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
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

      // Get related job info if linked
      let job = null;
      if (invoice.job_id) {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('id, title')
          .eq('id', invoice.job_id)
          .single();
        job = jobData;
      }

      // Get related quote info if linked
      let quote = null;
      if (invoice.quote_id) {
        const { data: quoteData } = await supabase
          .from('quotes')
          .select('id, number')
          .eq('id', invoice.quote_id)
          .single();
        quote = quoteData;
      }

      // Get payment history for this invoice
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, method, last4, received_at, status')
        .eq('invoice_id', invoiceId)
        .order('received_at', { ascending: false });

      console.log(`Invoice ${invoiceId} fetched for customer ${customerId}`);

      return new Response(
        JSON.stringify({ 
          invoice: {
            ...invoice,
            job,
            quote,
          },
          business,
          customerName,
          payments: payments || [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Customer invoice detail error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[quote-view] Public quote view request');
    
    const url = new URL(req.url);
    const quoteId = url.searchParams.get('id');
    const publicToken = url.searchParams.get('token');

    if (!quoteId || !publicToken) {
      return json({ error: 'Missing required parameters: id and token' }, 400);
    }

    // Use service role to bypass RLS for public access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch quote with public token validation
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        id, number, total, status, created_at, updated_at,
        customer_id, address, tax_rate, discount, subtotal,
        terms, payment_terms, frequency, deposit_required, deposit_percent,
        sent_at, is_subscription
      `)
      .eq('id', quoteId)
      .eq('public_token', publicToken)
      .single();

    if (quoteError || !quoteData) {
      console.error('[quote-view] Quote not found:', quoteError);
      return json({ error: 'Quote not found or invalid token' }, 404);
    }

    // Fetch line items
    const { data: lineItemsData, error: lineItemsError } = await supabase
      .from('quote_line_items')
      .select('id, name, qty, unit, unit_price, line_total, position')
      .eq('quote_id', quoteId)
      .order('position');

    if (lineItemsError) {
      console.error('[quote-view] Line items fetch error:', lineItemsError);
    }

    const quote = {
      id: quoteData.id,
      number: quoteData.number,
      customerId: quoteData.customer_id,
      address: quoteData.address,
      lineItems: (lineItemsData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        unitPrice: item.unit_price,
        lineTotal: item.line_total
      })),
      taxRate: quoteData.tax_rate,
      discount: quoteData.discount,
      subtotal: quoteData.subtotal,
      total: quoteData.total,
      status: quoteData.status,
      terms: quoteData.terms,
      paymentTerms: quoteData.payment_terms,
      frequency: quoteData.frequency,
      depositRequired: quoteData.deposit_required,
      depositPercent: quoteData.deposit_percent,
      sentAt: quoteData.sent_at,
      createdAt: quoteData.created_at,
      updatedAt: quoteData.updated_at,
      isSubscription: quoteData.is_subscription,
    };

    console.log('[quote-view] Quote fetched successfully:', quoteData.number);
    return json(quote);

  } catch (error: any) {
    console.error('[quote-view] Error:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
});

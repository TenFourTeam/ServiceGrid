import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[quotes-crud] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[quotes-crud] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      const { data, error, count } = await supabase
        .from('quotes')
        .select(`
          id, number, total, status, updated_at, public_token, view_count,
          customer_id,
          customers!inner(name, email)
        `, { count: 'exact' })
        .eq('business_id', ctx.businessId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[quotes-crud] GET error:', error);
        throw new Error(`Failed to fetch quotes: ${error.message}`);
      }

      const quotes = data?.map((quote: any) => ({
        id: quote.id,
        number: quote.number,
        total: quote.total,
        status: quote.status,
        updatedAt: quote.updated_at,
        publicToken: quote.public_token,
        viewCount: quote.view_count ?? 0,
        customerId: quote.customer_id,
        customerName: quote.customers?.name,
        customerEmail: quote.customers?.email,
      })) || [];

      console.log('[quotes-crud] Fetched', quotes.length, 'quotes');
      return json({ quotes, count: count || 0 });
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[quotes-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { customerId, status, total, subtotal, taxRate, discount, terms, address } = body;

      // Get next quote number
      const { data: numberData, error: numberError } = await supabase
        .rpc('next_est_number', { p_business_id: ctx.businessId });

      if (numberError) {
        console.error('[quotes-crud] Number generation error:', numberError);
        throw new Error(`Failed to generate quote number: ${numberError.message}`);
      }

      const { data, error } = await supabase
        .from('quotes')
        .insert([{
          business_id: ctx.businessId,
          owner_id: ctx.userId,
          customer_id: customerId,
          number: numberData,
          status: status || 'Draft',
          total: total || 0,
          subtotal: subtotal || 0,
          tax_rate: taxRate || 0,
          discount: discount || 0,
          terms,
          address
        }])
        .select()
        .single();

      if (error) {
        console.error('[quotes-crud] POST error:', error);
        throw new Error(`Failed to create quote: ${error.message}`);
      }

      console.log('[quotes-crud] Quote created:', data.id);
      return json({ quote: data });
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[quotes-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id, status, total, subtotal, taxRate, discount, terms, address, viewCount } = body;

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (total !== undefined) updateData.total = total;
      if (subtotal !== undefined) updateData.subtotal = subtotal;
      if (taxRate !== undefined) updateData.tax_rate = taxRate;
      if (discount !== undefined) updateData.discount = discount;
      if (terms !== undefined) updateData.terms = terms;
      if (address !== undefined) updateData.address = address;
      if (viewCount !== undefined) updateData.view_count = viewCount;

      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', id)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) {
        console.error('[quotes-crud] PUT error:', error);
        throw new Error(`Failed to update quote: ${error.message}`);
      }

      console.log('[quotes-crud] Quote updated:', data.id);
      return json({ quote: data });
    }

    if (req.method === 'DELETE') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[quotes-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id } = body;

      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id)
        .eq('business_id', ctx.businessId);

      if (error) {
        console.error('[quotes-crud] DELETE error:', error);
        throw new Error(`Failed to delete quote: ${error.message}`);
      }

      console.log('[quotes-crud] Quote deleted:', id);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[quotes-crud] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});
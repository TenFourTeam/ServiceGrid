import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[invoices-crud] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[invoices-crud] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      const { data, error, count } = await supabase
        .from('invoices')
        .select(`
          id, number, total, status, due_at, paid_at, 
          created_at, updated_at, public_token,
          customer_id,
          customers!inner(name, email)
        `, { count: 'exact' })
        .eq('business_id', ctx.businessId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[invoices-crud] GET error:', error);
        throw new Error(`Failed to fetch invoices: ${error.message}`);
      }

      const invoices = data?.map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number,
        total: invoice.total,
        status: invoice.status,
        dueAt: invoice.due_at,
        paidAt: invoice.paid_at,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        publicToken: invoice.public_token,
        customerId: invoice.customer_id,
        customerName: invoice.customers?.name,
        customerEmail: invoice.customers?.email,
      })) || [];

      console.log('[invoices-crud] Fetched', invoices.length, 'invoices');
      return json({ invoices, count: count || 0 });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { customerId, jobId, status, total, subtotal, taxRate, discount, dueAt } = body;

      // Get next invoice number
      const { data: numberData, error: numberError } = await supabase
        .rpc('next_inv_number', { p_business_id: ctx.businessId });

      if (numberError) {
        console.error('[invoices-crud] Number generation error:', numberError);
        throw new Error(`Failed to generate invoice number: ${numberError.message}`);
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          business_id: ctx.businessId,
          owner_id: ctx.userId,
          customer_id: customerId,
          job_id: jobId,
          number: numberData,
          status: status || 'Draft',
          total: total || 0,
          subtotal: subtotal || 0,
          tax_rate: taxRate || 0,
          discount: discount || 0,
          due_at: dueAt
        }])
        .select()
        .single();

      if (error) {
        console.error('[invoices-crud] POST error:', error);
        throw new Error(`Failed to create invoice: ${error.message}`);
      }

      console.log('[invoices-crud] Invoice created:', data.id);
      return json({ invoice: data });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { id, status, total, subtotal, taxRate, discount, dueAt, paidAt } = body;

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (total !== undefined) updateData.total = total;
      if (subtotal !== undefined) updateData.subtotal = subtotal;
      if (taxRate !== undefined) updateData.tax_rate = taxRate;
      if (discount !== undefined) updateData.discount = discount;
      if (dueAt !== undefined) updateData.due_at = dueAt;
      if (paidAt !== undefined) updateData.paid_at = paidAt;

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) {
        console.error('[invoices-crud] PUT error:', error);
        throw new Error(`Failed to update invoice: ${error.message}`);
      }

      console.log('[invoices-crud] Invoice updated:', data.id);
      return json({ invoice: data });
    }

    if (req.method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('business_id', ctx.businessId);

      if (error) {
        console.error('[invoices-crud] DELETE error:', error);
        throw new Error(`Failed to delete invoice: ${error.message}`);
      }

      console.log('[invoices-crud] Invoice deleted:', id);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[invoices-crud] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});
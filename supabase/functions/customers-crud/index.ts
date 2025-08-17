import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[customers-crud] ${req.method} request received`);
    console.log(`[customers-crud] Function is being called successfully!`);
    
    const ctx = await requireCtx(req);
    console.log('[customers-crud] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[customers-crud] GET error:', error);
        throw new Error(`Failed to fetch customers: ${error.message}`);
      }

      const customers = data?.map(customer => ({
        id: customer.id,
        businessId: customer.business_id,
        ownerId: customer.owner_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
      })) || [];

      console.log('[customers-crud] Fetched', customers.length, 'customers');
      return json({ customers, count: count || 0 });
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[customers-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { name, email, phone, address, notes } = body;

      const { data, error } = await supabase
        .from('customers')
        .insert([{
          business_id: ctx.businessId,
          owner_id: ctx.userId,
          name,
          email,
          phone,
          address,
          notes
        }])
        .select()
        .single();

      if (error) {
        console.error('[customers-crud] POST error:', error);
        throw new Error(`Failed to create customer: ${error.message}`);
      }

      const transformedCustomer = {
        id: data.id,
        businessId: data.business_id,
        ownerId: data.owner_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      console.log('[customers-crud] Customer created:', data.id);
      return json({ customer: transformedCustomer });
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[customers-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id, name, email, phone, address, notes } = body;

      const { data, error } = await supabase
        .from('customers')
        .update({ name, email, phone, address, notes })
        .eq('id', id)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) {
        console.error('[customers-crud] PUT error:', error);
        throw new Error(`Failed to update customer: ${error.message}`);
      }

      const transformedCustomer = {
        id: data.id,
        businessId: data.business_id,
        ownerId: data.owner_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      console.log('[customers-crud] Customer updated:', data.id);
      return json({ customer: transformedCustomer });
    }

    if (req.method === 'DELETE') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[customers-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id } = body;

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('business_id', ctx.businessId);

      if (error) {
        console.error('[customers-crud] DELETE error:', error);
        throw new Error(`Failed to delete customer: ${error.message}`);
      }

      console.log('[customers-crud] Customer deleted:', id);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[customers-crud] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});
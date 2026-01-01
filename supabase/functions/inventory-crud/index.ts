import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireCtx, json, corsHeaders } from '../_lib/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId, userId } = ctx;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const itemId = url.searchParams.get('id');
    const action = url.searchParams.get('action');

    // Handle transaction logging
    if (action === 'transaction' && req.method === 'POST') {
      const body = await req.json();
      
      // Get current quantity
      const { data: item, error: fetchError } = await supabase
        .from('inventory_items')
        .select('current_quantity')
        .eq('id', body.inventory_item_id)
        .eq('business_id', businessId)
        .single();

      if (fetchError || !item) {
        return json({ error: 'Item not found' }, { status: 404 });
      }

      const newQuantity = Number(item.current_quantity) + Number(body.quantity);

      // Insert transaction
      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          business_id: businessId,
          user_id: userId,
          inventory_item_id: body.inventory_item_id,
          transaction_type: body.transaction_type,
          quantity: body.quantity,
          job_id: body.job_id,
          notes: body.notes,
          transaction_date: body.transaction_date || new Date().toISOString(),
        });

      if (transactionError) throw transactionError;

      // Update item quantity
      const updateData: Record<string, any> = { current_quantity: newQuantity };
      if (body.transaction_type === 'restock') {
        updateData.last_restocked_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', body.inventory_item_id)
        .eq('business_id', businessId);

      if (updateError) throw updateError;

      return json({ success: true, newQuantity });
    }

    // GET - List items
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return json(data || []);
    }

    // POST - Create item
    if (req.method === 'POST') {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          ...body,
          business_id: businessId,
          owner_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return json(data, { status: 201 });
    }

    // PATCH - Update item
    if (req.method === 'PATCH') {
      if (!itemId) {
        return json({ error: 'Item ID required' }, { status: 400 });
      }

      const body = await req.json();
      
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) throw error;
      return json(data);
    }

    // DELETE - Soft delete item
    if (req.method === 'DELETE') {
      if (!itemId) {
        return json({ error: 'Item ID required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('inventory_items')
        .update({ is_active: false })
        .eq('id', itemId)
        .eq('business_id', businessId);

      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('[inventory-crud] Error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
});

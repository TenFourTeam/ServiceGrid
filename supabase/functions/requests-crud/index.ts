import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supaAdmin, businessId } = await requireCtx(req);

    if (req.method === 'GET') {
      // Fetch requests with customer information
      const { data: requests, error } = await supaAdmin
        .from('requests')
        .select(`
          *,
          customer:customers(
            id,
            name,
            email,
            phone,
            address
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        return json({ error: error.message }, { status: 400 });
      }

      return json({ data: requests });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const {
        customer_id,
        title,
        property_address,
        service_details,
        preferred_assessment_date,
        alternative_date,
        preferred_times,
        status = 'New',
        notes,
        owner_id
      } = body;

      const { data: request, error } = await supaAdmin
        .from('requests')
        .insert({
          business_id: businessId,
          owner_id,
          customer_id,
          title,
          property_address,
          service_details,
          preferred_assessment_date,
          alternative_date,
          preferred_times: preferred_times || [],
          status,
          notes
        })
        .select(`
          *,
          customer:customers(
            id,
            name,
            email,
            phone,
            address
          )
        `)
        .single();

      if (error) {
        console.error('Error creating request:', error);
        return json({ error: error.message }, { status: 400 });
      }

      return json({ data: request });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { id, ...updateData } = body;

      const { data: request, error } = await supaAdmin
        .from('requests')
        .update(updateData)
        .eq('id', id)
        .eq('business_id', businessId)
        .select(`
          *,
          customer:customers(
            id,
            name,
            email,
            phone,
            address
          )
        `)
        .single();

      if (error) {
        console.error('Error updating request:', error);
        return json({ error: error.message }, { status: 400 });
      }

      return json({ data: request });
    }

    if (req.method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return json({ error: 'Request ID is required' }, { status: 400 });
      }

      const { error } = await supaAdmin
        .from('requests')
        .delete()
        .eq('id', id)
        .eq('business_id', businessId);

      if (error) {
        console.error('Error deleting request:', error);
        return json({ error: error.message }, { status: 400 });
      }

      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('Unexpected error in requests-crud:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
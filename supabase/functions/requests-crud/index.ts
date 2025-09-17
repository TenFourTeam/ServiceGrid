import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[requests-crud] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[requests-crud] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Fetch requests with customer information
      const { data: requests, error } = await supabase
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
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[requests-crud] GET error:', error);
        throw new Error(`Failed to fetch requests: ${error.message}`);
      }

      console.log('[requests-crud] Fetched', requests?.length || 0, 'requests');
      return json(requests || []);
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        console.error('[requests-crud] POST JSON parse error:', e);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
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

      const { data: request, error } = await supabase
        .from('requests')
        .insert({
          business_id: ctx.businessId,
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
        console.error('[requests-crud] POST error:', error);
        throw new Error(`Failed to create request: ${error.message}`);
      }

      console.log('[requests-crud] Created request:', request.id);
      return json(request);
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        console.error('[requests-crud] PUT JSON parse error:', e);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      const { id, ...updateData } = body;

      const { data: request, error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', id)
        .eq('business_id', ctx.businessId)
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
        console.error('[requests-crud] PUT error:', error);
        throw new Error(`Failed to update request: ${error.message}`);
      }

      console.log('[requests-crud] Updated request:', request.id);
      return json(request);
    }

    if (req.method === 'DELETE') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        console.error('[requests-crud] DELETE JSON parse error:', e);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      const { id } = body;

      if (!id) {
        return json({ error: 'Request ID is required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id)
        .eq('business_id', ctx.businessId);

      if (error) {
        console.error('[requests-crud] DELETE error:', error);
        throw new Error(`Failed to delete request: ${error.message}`);
      }

      console.log('[requests-crud] Deleted request:', id);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('[requests-crud] Unexpected error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
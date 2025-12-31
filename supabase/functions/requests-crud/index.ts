import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  console.log('[requests-crud] ===== Function Entry =====');
  console.log('[requests-crud] Function is accessible and responding!');
  console.log(`[requests-crud] ${req.method} request to ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    console.log('[requests-crud] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[requests-crud] Starting authentication context resolution...');
    
    const ctx = await requireCtx(req);
    console.log('[requests-crud] Raw context resolved:', JSON.stringify(ctx, null, 2));
    
    // Critical validation - ensure authentication context is complete
    if (!ctx.userId || !ctx.businessId) {
      console.error('[requests-crud] Authentication context incomplete:', { 
        hasUserId: !!ctx.userId, 
        hasBusinessId: !!ctx.businessId 
      });
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[requests-crud] Authentication validated successfully:', {
      userId: ctx.userId,
      businessId: ctx.businessId
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      console.log('[requests-crud] Processing GET request...');
      
      // Simplified query first - just get requests without join
      const { data: requests, error } = await supabase
        .from('requests')
        .select('*')
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[requests-crud] GET error:', error);
        throw new Error(`Failed to fetch requests: ${error.message}`);
      }

      console.log('[requests-crud] Fetched', requests?.length || 0, 'requests');
      console.log('[requests-crud] Raw requests data:', requests);
      
      // Now try to get customer data separately
      if (requests && requests.length > 0) {
        const customerIds = [...new Set(requests.map(r => r.customer_id))];
        console.log('[requests-crud] Customer IDs to fetch:', customerIds);
        
        const { data: customers, error: customerError } = await supabase
          .from('customers')
          .select('id, name, email, phone, address')
          .in('id', customerIds);
          
        console.log('[requests-crud] Fetched customers:', customers);
          
        if (customerError) {
          console.error('[requests-crud] Customer fetch error:', customerError);
        } else {
          // Merge customer data with requests
          const customerMap = new Map(customers?.map(c => [c.id, c]) || []);
          console.log('[requests-crud] Customer map:', Object.fromEntries(customerMap));
          
          requests.forEach(request => {
            const customer = customerMap.get(request.customer_id);
            request.customer = customer || null;
            console.log(`[requests-crud] Request ${request.id} customer:`, customer);
          });
        }

        // Fetch assigned user profiles
        const assignedUserIds = [...new Set(requests.filter(r => r.assigned_to).map(r => r.assigned_to))];
        console.log('[requests-crud] Assigned user IDs to fetch:', assignedUserIds);
        
        if (assignedUserIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, display_name')
            .in('id', assignedUserIds);
            
          console.log('[requests-crud] Fetched profiles:', profiles);
            
          if (profileError) {
            console.error('[requests-crud] Profile fetch error:', profileError);
          } else {
            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
            requests.forEach(request => {
              if (request.assigned_to) {
                request.assigned_user = profileMap.get(request.assigned_to) || null;
              }
            });
          }
        }
      }
      
      console.log('[requests-crud] Final requests with customers:', requests);
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
        photos = []
      } = body;

      console.log('[requests-crud] POST - About to insert request with data:', {
        business_id: ctx.businessId,
        owner_id: ctx.userId,
        customer_id,
        title,
        status
      });

      const { data: request, error } = await supabase
        .from('requests')
        .insert({
          business_id: ctx.businessId,
          owner_id: ctx.userId,
          customer_id,
          title,
          property_address,
          service_details,
          preferred_assessment_date,
          alternative_date,
          preferred_times: preferred_times || [],
          status,
          notes,
          photos: photos || []
        })
        .select('*')
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
        .select('*')
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
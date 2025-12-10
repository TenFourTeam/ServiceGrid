import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  console.log('[appointment-requests-manage] ===== Function Entry =====');
  console.log(`[appointment-requests-manage] ${req.method} request to ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    
    if (!ctx.userId || !ctx.businessId) {
      console.error('[appointment-requests-manage] Authentication context incomplete');
      return json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('[appointment-requests-manage] Auth validated:', {
      userId: ctx.userId,
      businessId: ctx.businessId
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // GET - List appointment change requests for the business
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');

      let query = supabase
        .from('appointment_change_requests')
        .select(`
          *,
          jobs(id, title, starts_at, ends_at, address, status),
          customers(id, name, email, phone)
        `)
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: requests, error } = await query;

      if (error) {
        console.error('[appointment-requests-manage] GET error:', error);
        return json({ error: 'Failed to fetch requests' }, { status: 500 });
      }

      console.log('[appointment-requests-manage] Fetched', requests?.length || 0, 'requests');
      return json({ requests: requests || [] });
    }

    // PATCH - Approve or deny a request
    if (req.method === 'PATCH') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return json({ error: 'Invalid JSON' }, { status: 400 });
      }
      
      const { requestId, action, response } = body;

      if (!requestId || !action) {
        return json({ error: 'requestId and action are required' }, { status: 400 });
      }

      if (!['approve', 'deny'].includes(action)) {
        return json({ error: 'action must be "approve" or "deny"' }, { status: 400 });
      }

      // Fetch the request
      const { data: request, error: fetchError } = await supabase
        .from('appointment_change_requests')
        .select('*, jobs(id, title, starts_at)')
        .eq('id', requestId)
        .eq('business_id', ctx.businessId)
        .single();

      if (fetchError || !request) {
        console.error('[appointment-requests-manage] Request not found:', fetchError);
        return json({ error: 'Request not found' }, { status: 404 });
      }

      if (request.status !== 'pending') {
        return json({ error: 'Request has already been processed' }, { status: 400 });
      }

      const newStatus = action === 'approve' ? 'approved' : 'denied';

      // Update the request
      const { error: updateError } = await supabase
        .from('appointment_change_requests')
        .update({
          status: newStatus,
          business_response: response || null,
          responded_at: new Date().toISOString(),
          responded_by: ctx.userId,
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('[appointment-requests-manage] Update error:', updateError);
        return json({ error: 'Failed to update request' }, { status: 500 });
      }

      // If approved, update the job accordingly
      if (action === 'approve') {
        if (request.request_type === 'reschedule' && request.preferred_date) {
          let newStartsAt = request.preferred_date;
          
          // If preferred_times is set, try to use the first time
          if (request.preferred_times && request.preferred_times.length > 0) {
            const timeStr = request.preferred_times[0];
            let hour = 9;
            if (timeStr.includes('Morning')) hour = 9;
            else if (timeStr.includes('Afternoon')) hour = 13;
            else if (timeStr.includes('Evening')) hour = 17;
            
            const dateOnly = newStartsAt.split('T')[0];
            newStartsAt = `${dateOnly}T${hour.toString().padStart(2, '0')}:00:00`;
          }

          const { error: jobUpdateError } = await supabase
            .from('jobs')
            .update({ starts_at: newStartsAt })
            .eq('id', request.job_id);

          if (jobUpdateError) {
            console.error('[appointment-requests-manage] Job update error:', jobUpdateError);
          }
        } else if (request.request_type === 'cancel') {
          const { error: jobUpdateError } = await supabase
            .from('jobs')
            .update({ status: 'Canceled' })
            .eq('id', request.job_id);

          if (jobUpdateError) {
            console.error('[appointment-requests-manage] Job cancel error:', jobUpdateError);
          }
        }
      }

      console.log(`[appointment-requests-manage] Request ${requestId} ${newStatus}`);
      return json({ success: true, status: newStatus });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('[appointment-requests-manage] Error:', error);
    return json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});

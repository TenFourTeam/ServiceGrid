import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RequireCtxResult {
  userId: string;
  businessId: string;
}

async function requireCtx(req: Request, supabase: any): Promise<RequireCtxResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');

  const token = authHeader.replace('Bearer ', '');
  
  // Verify with Clerk
  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
  if (!clerkSecretKey) throw new Error('CLERK_SECRET_KEY not configured');

  const verifyRes = await fetch('https://api.clerk.com/v1/tokens/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!verifyRes.ok) throw new Error('Invalid token');
  const tokenData = await verifyRes.json();
  const clerkUserId = tokenData.sub;

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, default_business_id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (profileError || !profile) throw new Error('Profile not found');

  // Get businessId from query or default
  const url = new URL(req.url);
  const businessId = url.searchParams.get('businessId') || profile.default_business_id;

  if (!businessId) throw new Error('No business context');

  // Verify membership
  const { data: owner } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_id', profile.id)
    .single();

  if (!owner) {
    const { data: permission } = await supabase
      .from('business_permissions')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', profile.id)
      .single();

    if (!permission) throw new Error('Not authorized for this business');
  }

  return { userId: profile.id, businessId };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId, businessId } = await requireCtx(req, supabase);
    const url = new URL(req.url);

    // GET - List appointment change requests for the business
    if (req.method === 'GET') {
      const status = url.searchParams.get('status'); // pending, approved, denied, or null for all

      let query = supabase
        .from('appointment_change_requests')
        .select(`
          *,
          jobs(id, title, starts_at, ends_at, address, status),
          customers(id, name, email, phone)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: requests, error } = await query;

      if (error) {
        console.error('Error fetching requests:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch requests' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ requests }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH - Approve or deny a request
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { requestId, action, response } = body;

      if (!requestId || !action) {
        return new Response(
          JSON.stringify({ error: 'requestId and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['approve', 'deny'].includes(action)) {
        return new Response(
          JSON.stringify({ error: 'action must be "approve" or "deny"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch the request
      const { data: request, error: fetchError } = await supabase
        .from('appointment_change_requests')
        .select('*, jobs(id, title, starts_at)')
        .eq('id', requestId)
        .eq('business_id', businessId)
        .single();

      if (fetchError || !request) {
        return new Response(
          JSON.stringify({ error: 'Request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (request.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Request has already been processed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newStatus = action === 'approve' ? 'approved' : 'denied';

      // Update the request
      const { error: updateError } = await supabase
        .from('appointment_change_requests')
        .update({
          status: newStatus,
          business_response: response || null,
          responded_at: new Date().toISOString(),
          responded_by: userId,
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update request' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If approved, update the job accordingly
      if (action === 'approve') {
        if (request.request_type === 'reschedule' && request.preferred_date) {
          // Parse preferred date and time
          let newStartsAt = request.preferred_date;
          
          // If preferred_times is set, try to use the first time
          if (request.preferred_times && request.preferred_times.length > 0) {
            const timeStr = request.preferred_times[0];
            // Parse time strings like "Morning (8am - 12pm)" -> 08:00
            let hour = 9; // default to 9am
            if (timeStr.includes('Morning')) hour = 9;
            else if (timeStr.includes('Afternoon')) hour = 13;
            else if (timeStr.includes('Evening')) hour = 17;
            
            // Combine date with time
            const dateOnly = newStartsAt.split('T')[0];
            newStartsAt = `${dateOnly}T${hour.toString().padStart(2, '0')}:00:00`;
          }

          const { error: jobUpdateError } = await supabase
            .from('jobs')
            .update({ starts_at: newStartsAt })
            .eq('id', request.job_id);

          if (jobUpdateError) {
            console.error('Error updating job:', jobUpdateError);
            // Don't fail the whole request, just log
          }
        } else if (request.request_type === 'cancel') {
          const { error: jobUpdateError } = await supabase
            .from('jobs')
            .update({ status: 'Canceled' })
            .eq('id', request.job_id);

          if (jobUpdateError) {
            console.error('Error canceling job:', jobUpdateError);
          }
        }
      }

      console.log(`Request ${requestId} ${newStatus} by user ${userId}`);

      return new Response(
        JSON.stringify({ success: true, status: newStatus }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Appointment requests manage error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

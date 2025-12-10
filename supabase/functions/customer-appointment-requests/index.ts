import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RescheduleRequest {
  jobId: string;
  preferredDate?: string;
  alternativeDates?: string[];
  preferredTimes?: string[];
  reason?: string;
  customerNotes?: string;
}

interface CancelRequest {
  jobId: string;
  reason?: string;
  customerNotes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate customer via session token
    const sessionToken = req.headers.get('x-session-token');
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('customer_sessions')
      .select('*, customer_accounts(*, customers(id, name, email, business_id))')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = session.customer_accounts.customers.id;
    const businessId = session.customer_accounts.customers.business_id;

    // GET - List customer's appointment change requests
    if (req.method === 'GET') {
      const { data: requests, error } = await supabase
        .from('appointment_change_requests')
        .select(`
          *,
          jobs(id, title, starts_at, ends_at, address, status)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

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

    // POST - Create a new request
    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid or missing request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { type } = body;

      if (!type) {
        return new Response(
          JSON.stringify({ error: 'Request type is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (type === 'reschedule') {
        const { jobId, preferredDate, alternativeDates, preferredTimes, reason, customerNotes } = body as RescheduleRequest & { type: string };

        if (!jobId) {
          return new Response(
            JSON.stringify({ error: 'Job ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify job belongs to customer and is reschedulable
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('id, title, status, starts_at, customer_id, business_id')
          .eq('id', jobId)
          .eq('customer_id', customerId)
          .single();

        if (jobError || !job) {
          return new Response(
            JSON.stringify({ error: 'Job not found or access denied' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (job.status === 'Completed' || job.status === 'Canceled') {
          return new Response(
            JSON.stringify({ error: 'Cannot reschedule a completed or canceled job' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for existing pending request
        const { data: existingRequest } = await supabase
          .from('appointment_change_requests')
          .select('id')
          .eq('job_id', jobId)
          .eq('status', 'pending')
          .single();

        if (existingRequest) {
          return new Response(
            JSON.stringify({ error: 'A pending request already exists for this job' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create reschedule request
        const { data: request, error: createError } = await supabase
          .from('appointment_change_requests')
          .insert({
            job_id: jobId,
            customer_id: customerId,
            business_id: businessId,
            request_type: 'reschedule',
            preferred_date: preferredDate || null,
            alternative_dates: alternativeDates || [],
            preferred_times: preferredTimes || [],
            reason,
            customer_notes: customerNotes,
            status: 'pending',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating reschedule request:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Reschedule request created: ${request.id} for job ${jobId}`);

        return new Response(
          JSON.stringify({ success: true, request }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (type === 'cancel') {
        const { jobId, reason, customerNotes } = body as CancelRequest & { type: string };

        if (!jobId) {
          return new Response(
            JSON.stringify({ error: 'Job ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify job belongs to customer
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('id, title, status, starts_at, customer_id, business_id')
          .eq('id', jobId)
          .eq('customer_id', customerId)
          .single();

        if (jobError || !job) {
          return new Response(
            JSON.stringify({ error: 'Job not found or access denied' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (job.status === 'Completed' || job.status === 'Canceled') {
          return new Response(
            JSON.stringify({ error: 'Cannot cancel a completed or already canceled job' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for existing pending request
        const { data: existingRequest } = await supabase
          .from('appointment_change_requests')
          .select('id')
          .eq('job_id', jobId)
          .eq('status', 'pending')
          .single();

        if (existingRequest) {
          return new Response(
            JSON.stringify({ error: 'A pending request already exists for this job' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create cancel request
        const { data: request, error: createError } = await supabase
          .from('appointment_change_requests')
          .insert({
            job_id: jobId,
            customer_id: customerId,
            business_id: businessId,
            request_type: 'cancel',
            reason,
            customer_notes: customerNotes,
            status: 'pending',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating cancel request:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Cancel request created: ${request.id} for job ${jobId}`);

        return new Response(
          JSON.stringify({ success: true, request }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid request type. Must be "reschedule" or "cancel"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Customer appointment requests error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

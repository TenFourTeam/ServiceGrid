// Job confirmation endpoint - handles customer appointment confirmations via email
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const jobId = url.searchParams.get('job_id');
    const token = url.searchParams.get('token');

    if (req.method === 'GET') {
      // Handle job confirmation via GET request (new flow, like quote-events)
      if (!type || !jobId || !token) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (type === 'confirm') {
        // Verify token and update job status
        const { data: job, error: fetchError } = await supabaseAdmin
          .from('jobs')
          .select('id, business_id, status, confirmation_token')
          .eq('id', jobId)
          .eq('confirmation_token', token)
          .single();

        if (fetchError || !job) {
          console.error('Job fetch error for confirmation:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Job not found or confirmation link expired' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update job status to Schedule Approved
        const { data: updatedJob, error: updateError } = await supabaseAdmin
          .from('jobs')
          .update({ 
            status: 'Schedule Approved',
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)
          .select()
          .single();

        if (updateError) {
          console.error('Job update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to confirm appointment' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Job ${job.id} confirmed successfully`);
        return new Response(
          JSON.stringify({ success: true, job: updatedJob }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Job confirmation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
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
    const token = req.method === 'GET' ? url.searchParams.get('token') : null;

    if (req.method === 'GET') {
      // Fetch job details by confirmation token
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Missing confirmation token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: job, error: jobError } = await supabaseAdmin
        .from('jobs')
        .select(`
          *,
          business:businesses!jobs_business_id_fkey(name, phone, reply_to_email),
          customer:customers!jobs_customer_id_fkey(name, email, phone, address)
        `)
        .eq('confirmation_token', token)
        .single();

      if (jobError || !job) {
        console.error('Job fetch error:', jobError);
        return new Response(
          JSON.stringify({ error: 'Job not found or confirmation link expired' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ job }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'POST') {
      // Update job status to Schedule Approved
      const { token: postToken } = await req.json();

      if (!postToken) {
        return new Response(
          JSON.stringify({ error: 'Missing confirmation token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First, find the job
      const { data: job, error: fetchError } = await supabaseAdmin
        .from('jobs')
        .select('id, business_id, status')
        .eq('confirmation_token', postToken)
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
          confirmation_status: 'confirmed',
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

      return new Response(
        JSON.stringify({ success: true, job: updatedJob }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
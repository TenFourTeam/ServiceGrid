// Job confirmation endpoint - handles customer appointment confirmations via email
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { corsHeaders, json } from "../_lib/auth.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  console.log('[job-confirm] ===== Function Entry =====');
  console.log('[job-confirm] Method:', req.method);
  console.log('[job-confirm] URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return json(null, { headers: corsHeaders });
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

    console.log('[job-confirm] Parameters:', { type, jobId, token: token ? '***' : null });

    if (req.method === 'GET') {
      // Handle job confirmation via GET request (new flow, like quote-events)
      if (!type || !jobId || !token) {
        console.error('[job-confirm] Missing required parameters');
        return json(
          { error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      if (type === 'confirm') {
        console.log('[job-confirm] Processing confirmation for job:', jobId);
        
        // Verify token and update job status
        const { data: job, error: fetchError } = await supabaseAdmin
          .from('jobs')
          .select('id, business_id, status, confirmation_token')
          .eq('id', jobId)
          .eq('confirmation_token', token)
          .single();

        if (fetchError || !job) {
          console.error('[job-confirm] Job fetch error:', fetchError);
          return json(
            { error: 'Job not found or confirmation link expired' },
            { status: 404 }
          );
        }

        console.log('[job-confirm] Job found:', { id: job.id, currentStatus: job.status });

        // Update job status to Schedule Approved
        console.log('[job-confirm] Updating job status to Schedule Approved');
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
          console.error('[job-confirm] Job update error:', updateError);
          return json(
            { error: 'Failed to confirm appointment' },
            { status: 500 }
          );
        }

        console.log('[job-confirm] Job confirmed successfully:', updatedJob.id);
        return json(
          { success: true, job: updatedJob },
          { status: 200 }
        );
      }

      console.error('[job-confirm] Invalid action type:', type);
      return json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    console.error('[job-confirm] Method not allowed:', req.method);
    return json(
      { error: 'Method not allowed' },
      { status: 405 }
    );

  } catch (error) {
    console.error('[job-confirm] Unexpected error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
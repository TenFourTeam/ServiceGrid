import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { requireCtx, corsHeaders, json } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  console.log(`[jobs-crud-assign] ${req.method} request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      // Assign members to job
      const { jobId, userIds } = await req.json();
      
      if (!jobId || !userIds || !Array.isArray(userIds)) {
        return json({ error: 'Missing required fields: jobId, userIds' }, { status: 400, headers: corsHeaders });
      }

      // Verify the job belongs to the user's business
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id, business_id')
        .eq('id', jobId)
        .eq('business_id', ctx.businessId)
        .single();

      if (jobError || !job) {
        console.error('[jobs-crud-assign] Job verification failed:', jobError);
        return json({ error: 'Job not found or access denied' }, { status: 404, headers: corsHeaders });
      }

      // Create assignments (using ON CONFLICT to avoid duplicates)
      const assignments = userIds.map(userId => ({
        job_id: jobId,
        user_id: userId,
        assigned_by: ctx.userId
      }));

      const { data, error } = await supabase
        .from('job_assignments')
        .upsert(assignments, { 
          onConflict: 'job_id,user_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('[jobs-crud-assign] Assignment creation failed:', error);
        return json({ error: error.message }, { status: 400, headers: corsHeaders });
      }

      console.log(`[jobs-crud-assign] Created ${data?.length || 0} assignments for job ${jobId}`);
      return json({ assignments: data }, { headers: corsHeaders });
    }

    if (req.method === 'DELETE') {
      // Unassign members from job
      const { jobId, userIds } = await req.json();
      
      if (!jobId || !userIds || !Array.isArray(userIds)) {
        return json({ error: 'Missing required fields: jobId, userIds' }, { status: 400, headers: corsHeaders });
      }

      // Verify the job belongs to the user's business
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id, business_id')
        .eq('id', jobId)
        .eq('business_id', ctx.businessId)
        .single();

      if (jobError || !job) {
        console.error('[jobs-crud-assign] Job verification failed:', jobError);
        return json({ error: 'Job not found or access denied' }, { status: 404, headers: corsHeaders });
      }

      // Remove assignments
      const { data, error } = await supabase
        .from('job_assignments')
        .delete()
        .eq('job_id', jobId)
        .in('user_id', userIds)
        .select();

      if (error) {
        console.error('[jobs-crud-assign] Assignment deletion failed:', error);
        return json({ error: error.message }, { status: 400, headers: corsHeaders });
      }

      console.log(`[jobs-crud-assign] Removed ${data?.length || 0} assignments for job ${jobId}`);
      return json({ removed: data?.length || 0 }, { headers: corsHeaders });
    }

    return json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error('[jobs-crud-assign] Unexpected error:', error);
    return json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
});
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[unified-assignments] Processing request');
    
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;
    const url = new URL(req.url);
    
    if (req.method === 'GET') {
      const userId = url.searchParams.get('userId');
      const jobId = url.searchParams.get('jobId');
      const assignmentType = url.searchParams.get('type');

      let query = supabase
        .from('unified_assignments')
        .select('*')
        .eq('business_id', ctx.businessId);

      if (userId) query = query.eq('user_id', userId);
      if (jobId) query = query.eq('job_id', jobId);
      if (assignmentType) query = query.eq('assignment_type', assignmentType);

      const { data, error } = await query.order('assigned_at', { ascending: false });

      if (error) throw error;
      return json({ assignments: data || [] });
    }

    if (req.method === 'POST') {
      // Unified assignment - assign to job and optionally cascade to checklists
      const { jobId, userIds, assignToChecklists = true } = await req.json();

      // First, verify job exists and user has permission
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id, business_id')
        .eq('id', jobId)
        .eq('business_id', ctx.businessId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found or access denied');
      }

      // Assign to job
      const jobAssignments = userIds.map((userId: string) => ({
        job_id: jobId,
        user_id: userId,
        assigned_by: ctx.userId,
      }));

      const { error: assignError } = await supabase
        .from('job_assignments')
        .upsert(jobAssignments, { onConflict: 'job_id,user_id' });

      if (assignError) throw assignError;

      // Optionally cascade to checklist items
      if (assignToChecklists) {
        const { error: syncError } = await supabase.rpc('sync_job_checklist_assignments', {
          p_job_id: jobId,
          p_user_ids: userIds,
          p_assign: true
        });

        if (syncError) {
          console.warn('[unified-assignments] Checklist sync warning:', syncError);
        }
      }

      return json({ success: true, assignedCount: userIds.length });
    }

    if (req.method === 'DELETE') {
      // Unified unassignment
      const { jobId, userIds, removeFromChecklists = true } = await req.json();

      // Remove job assignments
      const { error: deleteError, count } = await supabase
        .from('job_assignments')
        .delete({ count: 'exact' })
        .eq('job_id', jobId)
        .in('user_id', userIds);

      if (deleteError) throw deleteError;

      // Optionally remove from checklist items
      if (removeFromChecklists) {
        const { error: syncError } = await supabase.rpc('sync_job_checklist_assignments', {
          p_job_id: jobId,
          p_user_ids: userIds,
          p_assign: false
        });

        if (syncError) {
          console.warn('[unified-assignments] Checklist unsync warning:', syncError);
        }
      }

      return json({ success: true, removedCount: count || 0 });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('[unified-assignments] Error:', error);
    return json(
      { error: error.message || 'Failed to process assignments' },
      { status: 500 }
    );
  }
});

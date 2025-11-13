import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[time-tracking-analytics] Processing request');
    
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;
    const url = new URL(req.url);
    const reportType = url.searchParams.get('type') || 'summary';
    const userId = url.searchParams.get('userId');

    if (reportType === 'time-by-job') {
      // Time by Job Report
      const { data, error } = await supabase
        .from('time_by_job_report')
        .select('*')
        .eq('business_id', ctx.businessId)
        .order('total_minutes', { ascending: false });

      if (error) throw error;
      return json({ report: data });
    }

    if (reportType === 'time-by-task') {
      // Time by Task Report
      const query = supabase
        .from('time_by_task_report')
        .select('*')
        .eq('business_id', ctx.businessId)
        .order('completed_at', { ascending: false });

      if (userId) {
        query.eq('completed_by', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return json({ report: data });
    }

    if (reportType === 'user-productivity') {
      // User Productivity Report
      const query = supabase
        .from('user_productivity_report')
        .select('*')
        .eq('business_id', ctx.businessId)
        .order('tasks_completed', { ascending: false });

      if (userId) {
        query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return json({ report: data });
    }

    // Summary Report
    const [jobStats, taskStats, userStats] = await Promise.all([
      supabase
        .from('time_by_job_report')
        .select('*')
        .eq('business_id', ctx.businessId),
      supabase
        .from('time_by_task_report')
        .select('*')
        .eq('business_id', ctx.businessId),
      supabase
        .from('user_productivity_report')
        .select('*')
        .eq('business_id', ctx.businessId),
    ]);

    const summary = {
      totalJobTime: jobStats.data?.reduce((sum, j) => sum + (j.total_minutes || 0), 0) || 0,
      totalTaskTime: taskStats.data?.reduce((sum, t) => sum + (t.time_spent_minutes || 0), 0) || 0,
      totalJobs: jobStats.data?.length || 0,
      totalTasksCompleted: taskStats.data?.length || 0,
      activeWorkers: userStats.data?.length || 0,
    };

    return json({ summary });
  } catch (error: any) {
    console.error('[time-tracking-analytics] Error:', error);
    return json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});

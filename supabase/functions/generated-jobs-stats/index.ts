import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireCtx, json, corsHeaders } from '../_lib/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId } = ctx;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const templateId = url.searchParams.get('templateId');

    if (req.method !== 'GET') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    if (!templateId) {
      return json({ error: 'Template ID required' }, { status: 400 });
    }

    // Fetch all jobs generated from this template
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(name, email, phone),
        assignments:job_assignments(
          user:profiles(full_name, email)
        )
      `)
      .eq('recurring_template_id', templateId)
      .eq('business_id', businessId)
      .order('starts_at', { ascending: false });

    if (error) throw error;

    // Calculate stats
    const stats = {
      totalGenerated: jobs?.length || 0,
      completed: jobs?.filter(j => j.status === 'Completed').length || 0,
      scheduled: jobs?.filter(j => j.status === 'Scheduled').length || 0,
      cancelled: jobs?.filter(j => j.status !== 'Completed' && j.status !== 'Scheduled' && j.status !== 'In Progress').length || 0,
      completionRate: 0,
      avgDurationMinutes: null as number | null,
      totalRevenue: 0,
      nextScheduledJob: null as any,
      recentJobs: jobs?.slice(0, 5) || [],
    };

    if (stats.totalGenerated > 0) {
      stats.completionRate = Math.round((stats.completed / stats.totalGenerated) * 100);
    }

    // Calculate average duration for completed jobs
    const completedJobs = jobs?.filter(j => 
      j.status === 'Completed' && 
      j.clock_in_time && 
      j.clock_out_time
    );

    if (completedJobs && completedJobs.length > 0) {
      const totalMinutes = completedJobs.reduce((sum, job) => {
        const start = new Date(job.clock_in_time).getTime();
        const end = new Date(job.clock_out_time).getTime();
        return sum + (end - start) / (1000 * 60);
      }, 0);
      stats.avgDurationMinutes = Math.round(totalMinutes / completedJobs.length);
    }

    // Calculate total revenue from completed jobs
    stats.totalRevenue = jobs
      ?.filter(j => j.status === 'Completed' && j.total)
      .reduce((sum, j) => sum + (j.total || 0), 0) || 0;

    // Find next scheduled job
    const futureJobs = jobs
      ?.filter(j => j.status === 'Scheduled' && j.starts_at)
      .filter(j => new Date(j.starts_at) > new Date())
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    stats.nextScheduledJob = futureJobs?.[0] || null;

    return json(stats);
  } catch (error) {
    console.error('[generated-jobs-stats] Error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
});

import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  jobId?: string;
  groupBy: 'daily' | 'weekly';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[time-breakdown-report] Processing request');
    
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;
    const url = new URL(req.url);
    
    const filters: ReportFilters = {
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      userId: url.searchParams.get('userId') || undefined,
      jobId: url.searchParams.get('jobId') || undefined,
      groupBy: (url.searchParams.get('groupBy') as 'daily' | 'weekly') || 'daily',
    };

    console.log('[time-breakdown-report] Filters:', filters);

    // Choose the appropriate view based on groupBy
    const viewName = filters.groupBy === 'weekly' 
      ? 'weekly_time_breakdown' 
      : 'daily_time_breakdown';

    let query = supabase
      .from(viewName)
      .select('*')
      .eq('business_id', ctx.businessId);

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.jobId) {
      query = query.eq('job_id', filters.jobId);
    }
    if (filters.startDate) {
      const dateField = filters.groupBy === 'weekly' ? 'week_start' : 'work_date';
      query = query.gte(dateField, filters.startDate);
    }
    if (filters.endDate) {
      const dateField = filters.groupBy === 'weekly' ? 'week_start' : 'work_date';
      query = query.lte(dateField, filters.endDate);
    }

    // Order by date descending
    const dateField = filters.groupBy === 'weekly' ? 'week_start' : 'work_date';
    query = query.order(dateField, { ascending: false });

    const { data: timeData, error: timeError } = await query;
    if (timeError) {
      console.error('[time-breakdown-report] Time data error:', timeError);
      throw timeError;
    }

    console.log(`[time-breakdown-report] Found ${timeData?.length || 0} time entries`);

    // Get task category breakdown
    let categoryQuery = supabase
      .from('task_category_breakdown')
      .select('*')
      .eq('business_id', ctx.businessId);

    if (filters.userId) {
      categoryQuery = categoryQuery.eq('user_id', filters.userId);
    }
    if (filters.startDate) {
      categoryQuery = categoryQuery.gte('completion_date', filters.startDate);
    }
    if (filters.endDate) {
      categoryQuery = categoryQuery.lte('completion_date', filters.endDate);
    }

    categoryQuery = categoryQuery.order('completion_date', { ascending: false });

    const { data: categoryData, error: categoryError } = await categoryQuery;
    if (categoryError) {
      console.error('[time-breakdown-report] Category data error:', categoryError);
      throw categoryError;
    }

    console.log(`[time-breakdown-report] Found ${categoryData?.length || 0} category entries`);

    // Calculate summary statistics
    const totalTimeMinutes = timeData?.reduce((sum, row) => 
      sum + (Number(row.timesheet_minutes) || 0), 0) || 0;
    const totalTaskMinutes = timeData?.reduce((sum, row) => 
      sum + (Number(row.task_minutes) || 0), 0) || 0;
    const totalTasksCompleted = timeData?.reduce((sum, row) => 
      sum + (Number(row.tasks_completed) || 0), 0) || 0;
    
    const uniqueUserIds = new Set(timeData?.map(row => row.user_id) || []);
    const uniqueJobIds = new Set(timeData?.map(row => row.job_id).filter(Boolean) || []);

    const summary = {
      totalTimeMinutes,
      totalTaskMinutes,
      totalTasksCompleted,
      uniqueUsers: uniqueUserIds.size,
      uniqueJobs: uniqueJobIds.size,
      dateRange: {
        start: filters.startDate,
        end: filters.endDate,
      },
    };

    console.log('[time-breakdown-report] Summary:', summary);

    return json({
      timeBreakdown: timeData || [],
      categoryBreakdown: categoryData || [],
      summary,
      filters,
    });
  } catch (error: any) {
    console.error('[time-breakdown-report] Error:', error);
    return json(
      { error: error.message || 'Failed to fetch time breakdown report' },
      { status: 500 }
    );
  }
});

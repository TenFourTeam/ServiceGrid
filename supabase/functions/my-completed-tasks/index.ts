import { corsHeaders, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[my-completed-tasks] Processing request');
    
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;

    // Parse query parameters
    const url = new URL(req.url);
    const dateRangeParam = url.searchParams.get('dateRange') || '30';
    const jobId = url.searchParams.get('jobId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build date filter
    let dateFilter: string | null = null;
    if (dateRangeParam !== 'all') {
      const days = parseInt(dateRangeParam);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      dateFilter = cutoffDate.toISOString();
    }

    // Build query for completed items
    let query = supabase
      .from('sg_checklist_items')
      .select(`
        id,
        title,
        description,
        required_photo_count,
        completed_at,
        completed_by,
        is_completed,
        time_spent_minutes,
        timesheet_entry_id,
        checklist:sg_checklists!inner(
          id,
          title,
          job:jobs!inner(
            id,
            title,
            address,
            starts_at
          )
        ),
        completed_by_profile:profiles!sg_checklist_items_completed_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('assigned_to', ctx.userId)
      .eq('is_completed', true);

    // Apply date filter
    if (dateFilter) {
      query = query.gte('completed_at', dateFilter);
    }

    // Apply job filter
    if (jobId) {
      query = query.eq('checklist.job.id', jobId);
    }

    // Execute query with pagination
    const { data: items, error, count } = await query
      .order('completed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch media for each item (checking both patterns)
    const completedTasks = await Promise.all(
      (items || []).map(async (item) => {
        // Fetch media using both patterns
        const { data: mediaData } = await supabase
          .from('sg_media')
          .select('id, file_type, public_url, thumbnail_url, created_at')
          .or(`checklist_item_id.eq.${item.id},metadata->>checklist_item_id.eq.${item.id}`)
          .order('created_at', { ascending: true });

        return {
          itemId: item.id,
          itemTitle: item.title,
          itemDescription: item.description,
          requiredPhotoCount: item.required_photo_count,
          completedAt: item.completed_at,
          completedBy: item.completed_by_profile ? {
            id: item.completed_by_profile.id,
            name: item.completed_by_profile.full_name,
            email: item.completed_by_profile.email,
          } : null,
          checklistId: item.checklist.id,
          checklistTitle: item.checklist.title,
          jobId: item.checklist.job.id,
          jobTitle: item.checklist.job.title,
          jobAddress: item.checklist.job.address,
          jobStartsAt: item.checklist.job.starts_at,
          media: mediaData || [],
          timeSpentMinutes: item.time_spent_minutes,
          timesheetEntryId: item.timesheet_entry_id,
        };
      })
    );

    // Calculate stats
    const totalPhotos = completedTasks.reduce((sum, task) => sum + task.media.length, 0);

    // Get total completed count (all time)
    const { count: totalCompleted } = await supabase
      .from('sg_checklist_items')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', ctx.userId)
      .eq('is_completed', true);

    return new Response(
      JSON.stringify({
        completedTasks,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit,
        },
        stats: {
          totalCompleted: totalCompleted || 0,
          completedInRange: completedTasks.length,
          totalPhotos,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[my-completed-tasks] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('authentication') ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

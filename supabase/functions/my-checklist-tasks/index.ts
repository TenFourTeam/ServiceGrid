import { corsHeaders, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[my-checklist-tasks] Processing request');
    
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;
    
    // Get current timesheet status
    const { data: currentTimesheet } = await supabase
      .from('timesheet_entries')
      .select('id, job_id, clock_in_time')
      .eq('user_id', ctx.userId)
      .eq('business_id', ctx.businessId)
      .is('clock_out_time', null)
      .single();

    // Fetch all incomplete items assigned to current user
    const { data: items, error } = await supabase
      .from('sg_checklist_items')
      .select(`
        id,
        title,
        description,
        required_photo_count,
        is_completed,
        checklist:sg_checklists!inner(
          id,
          title,
          job:jobs!inner(
            id,
            title,
            starts_at,
            address
          )
        )
      `)
      .eq('assigned_to', ctx.userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get media count for each item
    const itemsWithMedia = await Promise.all(
      (items || []).map(async (item) => {
        const { count } = await supabase
          .from('sg_media')
          .select('id', { count: 'exact', head: true })
          .eq('metadata->>checklist_item_id', item.id);

        return {
          itemId: item.id,
          itemTitle: item.title,
          itemDescription: item.description,
          requiredPhotoCount: item.required_photo_count,
          currentPhotoCount: count || 0,
          checklistId: item.checklist.id,
          checklistTitle: item.checklist.title,
          jobId: item.checklist.job.id,
          jobTitle: item.checklist.job.title,
          jobStartsAt: item.checklist.job.starts_at,
          jobAddress: item.checklist.job.address,
        };
      })
    );

    return new Response(JSON.stringify({ 
      tasks: itemsWithMedia,
      currentTimesheet: currentTimesheet ? {
        id: currentTimesheet.id,
        jobId: currentTimesheet.job_id,
        clockInTime: currentTimesheet.clock_in_time,
      } : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[my-checklist-tasks] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('authentication') ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

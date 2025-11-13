import { corsHeaders, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[checklist-item-complete] Processing request');
    
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;

    const { itemId, isCompleted } = await req.json();
    
    // Get current timesheet entry if user is clocked in
    let currentTimesheetEntry = null;
    let timeSpent = null;
    
    if (isCompleted) {
      const { data: timesheetData } = await supabase
        .from('timesheet_entries')
        .select('id, clock_in_time, job_id')
        .eq('user_id', ctx.userId)
        .is('clock_out_time', null)
        .single();
      
      currentTimesheetEntry = timesheetData;
      
      // Calculate time spent from assignment to completion
      const { data: itemData } = await supabase
        .from('sg_checklist_items')
        .select('created_at')
        .eq('id', itemId)
        .single();
      
      if (itemData) {
        const startTime = new Date(itemData.created_at);
        const endTime = new Date();
        timeSpent = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // minutes
      }
    }

    // Fetch item details
    const { data: item, error: itemError } = await supabase
      .from('sg_checklist_items')
      .select('*, checklist:sg_checklists(id, business_id)')
      .eq('id', itemId)
      .single();
    
    if (itemError || !item) throw new Error('Item not found');

    // If completing (not uncompleting), enforce photo requirement
    if (isCompleted && item.required_photo_count > 0) {
      const { count: photoCount } = await supabase
        .from('sg_media')
        .select('id', { count: 'exact', head: true })
        .eq('checklist_item_id', itemId);
      
      if ((photoCount || 0) < item.required_photo_count) {
        // Log failed attempt
        console.log('[checklist-item-complete] Photo validation failed:', {
          itemId,
          required: item.required_photo_count,
          current: photoCount || 0
        });
        
        await supabase.from('sg_checklist_events').insert({
          checklist_id: item.checklist.id,
          item_id: itemId,
          event_type: 'photo_required_failed',
          user_id: ctx.userId,
          metadata: { 
            required: item.required_photo_count,
            current: photoCount || 0
          }
        });
        
        return new Response(JSON.stringify({ 
          success: false,
          error: `This item requires ${item.required_photo_count} photo(s). Current: ${photoCount || 0}`,
          required: item.required_photo_count,
          current: photoCount || 0
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update item completion status
    const { data: updatedItem, error: updateError } = await supabase
      .from('sg_checklist_items')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        completed_by: isCompleted ? ctx.userId : null,
        time_spent_minutes: isCompleted ? timeSpent : null,
        timesheet_entry_id: isCompleted && currentTimesheetEntry ? currentTimesheetEntry.id : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();
    
    if (updateError) throw updateError;

    // Log event
    console.log('[checklist-item-complete] Item updated:', {
      itemId,
      isCompleted,
      requiredPhotos: item.required_photo_count
    });
    
    await supabase.from('sg_checklist_events').insert({
      checklist_id: item.checklist.id,
      item_id: itemId,
      event_type: isCompleted ? 'item_completed' : 'item_uncompleted',
      user_id: ctx.userId,
      metadata: {}
    });

    return new Response(JSON.stringify({ 
      success: true,
      item: updatedItem
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[checklist-item-complete] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('authentication') ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
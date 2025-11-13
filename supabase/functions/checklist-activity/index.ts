import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { requireCtx, corsHeaders, json } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const url = new URL(req.url);
    const checklistId = url.searchParams.get('checklistId');

    if (!checklistId) {
      return json({ error: 'checklistId is required' }, { status: 400 });
    }

    console.log('[checklist-activity] Fetching activity for checklist:', checklistId);

    // Fetch checklist events with user and item details
    const { data: events, error } = await ctx.supaAdmin
      .from('sg_checklist_events')
      .select(`
        id,
        event_type,
        created_at,
        metadata,
        user_id,
        item_id,
        user:profiles!sg_checklist_events_user_id_fkey (
          id,
          full_name,
          email
        ),
        item:sg_checklist_items!sg_checklist_events_item_id_fkey (
          id,
          title
        )
      `)
      .eq('checklist_id', checklistId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[checklist-activity] Error fetching events:', error);
      return json({ error: error.message }, { status: 500 });
    }

    console.log('[checklist-activity] Found', events?.length || 0, 'events');

    // Format the response
    const formattedEvents = events?.map(event => ({
      id: event.id,
      event_type: event.event_type,
      created_at: event.created_at,
      metadata: event.metadata,
      user: event.user ? {
        id: event.user.id,
        name: event.user.full_name,
        email: event.user.email,
      } : null,
      item: event.item ? {
        id: event.item.id,
        title: event.item.title,
      } : null,
    })) || [];

    return json({ events: formattedEvents });
  } catch (error) {
    console.error('[checklist-activity] Unexpected error:', error);
    return json({ error: error.message }, { status: 500 });
  }
});

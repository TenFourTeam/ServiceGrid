import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');

    if (!conversationId) {
      return json({ error: 'conversationId is required' }, { status: 400 });
    }

    console.log('[conversation-activity] Fetching activity for:', conversationId);

    // Verify the conversation belongs to the user's business
    const { data: conversation, error: convError } = await supabase
      .from('sg_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('business_id', ctx.businessId)
      .single();

    if (convError || !conversation) {
      console.error('[conversation-activity] Conversation not found or access denied');
      return json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Fetch events
    const { data: events, error } = await supabase
      .from('sg_conversation_events')
      .select('id, event_type, created_at, metadata, user_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[conversation-activity] Error fetching events:', error);
      return json({ error: error.message }, { status: 500 });
    }

    // Fetch user profiles for all events
    const userIds = [...new Set(events?.map(e => e.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Format response
    const formattedEvents = events?.map(event => {
      const profile = profileMap.get(event.user_id);
      return {
        id: event.id,
        event_type: event.event_type,
        created_at: event.created_at,
        metadata: event.metadata,
        user: profile ? {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
        } : null,
      };
    }) || [];

    console.log('[conversation-activity] Returning', formattedEvents.length, 'events');
    return json({ events: formattedEvents });
  } catch (error: any) {
    console.error('[conversation-activity] Error:', error);
    return json({ error: error.message || 'Failed to fetch activity' }, { status: 500 });
  }
});

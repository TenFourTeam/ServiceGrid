import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const ok = (data: unknown, status = 200) => json(data, { status });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[conversations-crud] ${req.method} request received`);

    const ctx = await requireCtx(req);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');

    // GET: List conversations with preview
    if (req.method === 'GET' && !conversationId) {
      const { data, error } = await supabase
        .rpc('get_conversations_with_preview', { p_business_id: ctx.businessId });

      if (error) {
        console.error('[conversations-crud] Error fetching conversations:', error);
        return ok({ error: error.message }, 500);
      }

      console.log('[conversations-crud] Fetched', data?.length || 0, 'conversations');
      return ok({ conversations: data || [] });
    }

    // GET: Single conversation details
    if (req.method === 'GET' && conversationId) {
      const { data, error } = await supabase
        .from('sg_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('business_id', ctx.businessId)
        .single();

      if (error) {
        console.error('[conversations-crud] Error fetching conversation:', error);
        return ok({ error: error.message }, 404);
      }

      return ok({ conversation: data });
    }

    // POST: Create new conversation
    if (req.method === 'POST') {
      const { title } = await req.json();

      const { data, error } = await supabase
        .from('sg_conversations')
        .insert({
          business_id: ctx.businessId,
          created_by: ctx.userId,
          title: title || 'Team Chat',
        })
        .select()
        .single();

      if (error) {
        console.error('[conversations-crud] Error creating conversation:', error);
        return ok({ error: error.message }, 500);
      }

      console.log('[conversations-crud] Created conversation:', data.id);
      return ok({ conversation: data });
    }

    // PATCH: Update conversation (archive, rename)
    if (req.method === 'PATCH' && conversationId) {
      const updates = await req.json();

      const { data, error } = await supabase
        .from('sg_conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) {
        console.error('[conversations-crud] Error updating conversation:', error);
        return ok({ error: error.message }, 500);
      }

      console.log('[conversations-crud] Updated conversation:', data.id);
      return ok({ conversation: data });
    }

    // DELETE: Delete conversation
    if (req.method === 'DELETE' && conversationId) {
      const { error } = await supabase
        .from('sg_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('business_id', ctx.businessId);

      if (error) {
        console.error('[conversations-crud] Error deleting conversation:', error);
        return ok({ error: error.message }, 500);
      }

      console.log('[conversations-crud] Deleted conversation:', conversationId);
      return ok({ success: true });
    }

    return ok({ error: 'Invalid request' }, 400);

  } catch (error: any) {
    console.error('[conversations-crud] Error:', error);
    return ok({ error: error.message || 'Failed to process request' }, 500);
  }
});
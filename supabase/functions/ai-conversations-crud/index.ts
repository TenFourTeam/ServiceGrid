import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireCtx, json, corsHeaders } from '../_lib/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId, userId } = ctx;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('id');

    // GET - List or fetch single conversation
    if (req.method === 'GET') {
      if (conversationId) {
        const { data, error } = await supabase
          .from('ai_chat_conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('business_id', businessId)
          .single();

        if (error) throw error;
        return json(data);
      }

      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('id, title, created_at, updated_at')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return json(data || []);
    }

    // POST - Create conversation
    if (req.method === 'POST') {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .insert({
          business_id: businessId,
          user_id: userId,
          title: body.title || 'New conversation',
          entity_context: body.entity_context || {},
        })
        .select()
        .single();

      if (error) throw error;
      return json(data, { status: 201 });
    }

    // PATCH - Update conversation
    if (req.method === 'PATCH') {
      if (!conversationId) {
        return json({ error: 'Conversation ID required' }, { status: 400 });
      }

      const body = await req.json();
      
      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .update({
          title: body.title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) throw error;
      return json(data);
    }

    // DELETE - Delete conversation
    if (req.method === 'DELETE') {
      if (!conversationId) {
        return json({ error: 'Conversation ID required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('ai_chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('business_id', businessId);

      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('[ai-conversations-crud] Error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
});

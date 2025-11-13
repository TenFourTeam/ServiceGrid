import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const ok = (data: unknown, status = 200) => json(data, { status });

// Helper: Parse @mentions from message content
function parseMentions(content: string): string[] {
  // Match pattern: @[Display Name](user-id)
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2]); // user-id
  }

  return mentions;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[messages-crud] ${req.method} request received`);

    const ctx = await requireCtx(req);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');
    const messageId = url.searchParams.get('messageId');

    // GET: Fetch messages for conversation
    if (req.method === 'GET' && conversationId) {
      const { data, error } = await supabase
        .from('sg_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            full_name
          )
        `)
        .eq('conversation_id', conversationId)
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[messages-crud] Error fetching messages:', error);
        return ok({ error: error.message }, 500);
      }

      console.log('[messages-crud] Fetched', data?.length || 0, 'messages');
      return ok({ messages: data || [] });
    }

    // POST: Send message
    if (req.method === 'POST') {
      const { conversationId, content, attachments } = await req.json();

      if (!conversationId || !content) {
        return ok({ error: 'Missing conversationId or content' }, 400);
      }

      // Parse mentions from content
      const parsedMentions = parseMentions(content);

      const { data, error } = await supabase
        .from('sg_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: ctx.userId,
          business_id: ctx.businessId,
          content,
          mentions: JSON.stringify(parsedMentions),
          attachments: JSON.stringify(attachments || []),
        })
        .select(`
          *,
          sender:sender_id (
            id,
            full_name
          )
        `)
        .single();

      if (error) {
        console.error('[messages-crud] Error sending message:', error);
        return ok({ error: error.message }, 500);
      }

      console.log('[messages-crud] Sent message:', data.id);
      return ok({ message: data });
    }

    // PATCH: Edit message
    if (req.method === 'PATCH' && messageId) {
      const { content } = await req.json();

      // Check edit time limit (15 minutes)
      const { data: existingMessage } = await supabase
        .from('sg_messages')
        .select('created_at, sender_id')
        .eq('id', messageId)
        .single();

      if (existingMessage?.sender_id !== ctx.userId) {
        return ok({ error: 'Unauthorized to edit this message' }, 403);
      }

      const createdAt = new Date(existingMessage.created_at);
      const now = new Date();
      const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      if (minutesSinceCreation > 15) {
        return ok({ error: 'Message can only be edited within 15 minutes' }, 400);
      }

      const { data, error } = await supabase
        .from('sg_messages')
        .update({
          content,
          edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', ctx.userId)
        .select()
        .single();

      if (error) {
        console.error('[messages-crud] Error editing message:', error);
        return ok({ error: error.message }, 500);
      }

      console.log('[messages-crud] Edited message:', data.id);
      return ok({ message: data });
    }

    // DELETE: Delete message
    if (req.method === 'DELETE' && messageId) {
      const { error } = await supabase
        .from('sg_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', ctx.userId);

      if (error) {
        console.error('[messages-crud] Error deleting message:', error);
        return ok({ error: error.message }, 500);
      }

      console.log('[messages-crud] Deleted message:', messageId);
      return ok({ success: true });
    }

    return ok({ error: 'Invalid request' }, 400);

  } catch (error: any) {
    console.error('[messages-crud] Error:', error);
    return ok({ error: error.message || 'Failed to process request' }, 500);
  }
});
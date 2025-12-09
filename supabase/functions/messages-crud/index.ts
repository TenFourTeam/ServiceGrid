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

// Helper: Enrich messages with sender info (handles both users and customers)
async function enrichMessagesWithSender(supabase: any, messages: any[]) {
  if (!messages || messages.length === 0) return [];

  // Separate user and customer sender IDs
  const userSenderIds = [...new Set(
    messages.filter(m => m.sender_type !== 'customer' && m.sender_id)
      .map(m => m.sender_id)
  )];
  const customerSenderIds = [...new Set(
    messages.filter(m => m.sender_type === 'customer' && m.sender_id)
      .map(m => m.sender_id)
  )];

  // Fetch user profiles
  let userProfiles: Record<string, any> = {};
  if (userSenderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userSenderIds);
    
    if (profiles) {
      userProfiles = profiles.reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }
  }

  // Fetch customer names
  let customerNames: Record<string, string> = {};
  if (customerSenderIds.length > 0) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', customerSenderIds);
    
    if (customers) {
      customerNames = customers.reduce((acc: any, c: any) => {
        acc[c.id] = c.name;
        return acc;
      }, {});
    }
  }

  // Enrich messages
  return messages.map(msg => {
    if (msg.sender_type === 'customer') {
      return {
        ...msg,
        sender: null,
        customer_name: customerNames[msg.sender_id] || 'Customer',
      };
    } else {
      const profile = userProfiles[msg.sender_id];
      return {
        ...msg,
        sender: profile ? { id: profile.id, full_name: profile.full_name } : null,
      };
    }
  });
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
    const action = url.searchParams.get('action');

    // GET: Fetch unread mentions for current user
    if (req.method === 'GET' && action === 'unreadMentions') {
      const { data, error } = await supabase
        .from('sg_messages')
        .select('id, conversation_id, content, created_at, mentions, sender_id, sender_type')
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[messages-crud] Error fetching unread mentions:', error);
        return ok({ error: error.message }, 500);
      }

      // Filter messages where mentions array contains the current userId
      const filteredMentions = (data || []).filter(msg => {
        const mentionsArray = Array.isArray(msg.mentions) ? msg.mentions : [];
        return mentionsArray.includes(ctx.userId);
      });

      // Enrich with sender info
      const enrichedMentions = await enrichMessagesWithSender(supabase, filteredMentions);

      const mentions = enrichedMentions.map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        content: msg.content,
        sender_name: msg.sender_type === 'customer' 
          ? msg.customer_name 
          : (msg.sender?.full_name || 'Unknown'),
        created_at: msg.created_at,
      }));

      console.log('[messages-crud] Fetched', mentions.length, 'unread mentions');
      return ok({ mentions });
    }

    // GET: Fetch messages for conversation
    if (req.method === 'GET' && conversationId) {
      const { data, error } = await supabase
        .from('sg_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[messages-crud] Error fetching messages:', error);
        return ok({ error: error.message }, 500);
      }

      // Enrich with sender info (handles both users and customers)
      const enrichedMessages = await enrichMessagesWithSender(supabase, data || []);

      console.log('[messages-crud] Fetched', enrichedMessages.length, 'messages');
      return ok({ messages: enrichedMessages });
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
          sender_type: 'user', // Business team member
          mentions: parsedMentions,
          attachments: attachments || [],
        })
        .select('*')
        .single();

      if (error) {
        console.error('[messages-crud] Error sending message:', error);
        return ok({ error: error.message }, 500);
      }

      // Enrich with sender info
      const [enrichedMessage] = await enrichMessagesWithSender(supabase, [data]);

      console.log('[messages-crud] Sent message:', data.id);
      return ok({ message: enrichedMessage });
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

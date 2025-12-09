import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

interface CustomerSession {
  customer_id: string;
  business_id: string;
  customer_name: string;
}

async function validateSessionToken(supabase: any, sessionToken: string): Promise<CustomerSession | null> {
  console.log('[customer-messages-crud] Validating session token');
  
  const { data: session, error } = await supabase
    .from('customer_sessions')
    .select(`
      id,
      customer_account_id,
      expires_at,
      customer_accounts!inner (
        id,
        customer_id,
        customers!inner (
          id,
          name,
          business_id
        )
      )
    `)
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !session) {
    console.error('[customer-messages-crud] Session validation failed:', error);
    return null;
  }

  const customerAccount = session.customer_accounts;
  const customer = customerAccount.customers;

  return {
    customer_id: customer.id,
    business_id: customer.business_id,
    customer_name: customer.name,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate session token
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No session token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerSession = await validateSessionToken(supabase, sessionToken);
    if (!customerSession) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customer_id, business_id, customer_name } = customerSession;
    console.log(`[customer-messages-crud] Authenticated customer: ${customer_id} for business: ${business_id}`);

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');

    if (req.method === 'GET') {
      if (conversationId) {
        // Get messages for a specific conversation
        console.log(`[customer-messages-crud] Fetching messages for conversation: ${conversationId}`);
        
        // First verify the conversation belongs to this customer
        const { data: conversation, error: convError } = await supabase
          .from('sg_conversations')
          .select('id, title, customer_id, business_id')
          .eq('id', conversationId)
          .eq('customer_id', customer_id)
          .eq('business_id', business_id)
          .single();

        if (convError || !conversation) {
          return new Response(
            JSON.stringify({ error: 'Conversation not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get messages with attachments
        const { data: messages, error: msgError } = await supabase
          .from('sg_messages')
          .select(`
            id,
            content,
            created_at,
            sender_id,
            sender_type,
            metadata,
            attachments
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('[customer-messages-crud] Error fetching messages:', msgError);
          throw msgError;
        }

        // Get all user sender IDs for batch profile lookup
        const userSenderIds = [...new Set(
          messages.filter((m: any) => m.sender_type !== 'customer' && m.sender_id)
            .map((m: any) => m.sender_id)
        )];

        // Batch fetch user profiles
        let userProfiles: Record<string, any> = {};
        if (userSenderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userSenderIds);
          
          if (profiles) {
            userProfiles = profiles.reduce((acc: any, p: any) => {
              acc[p.id] = p;
              return acc;
            }, {});
          }
        }

        // Collect all attachment IDs from messages to batch fetch media URLs
        const allAttachmentIds: string[] = [];
        messages.forEach((msg: any) => {
          const msgAttachments = msg.attachments || [];
          msgAttachments.forEach((att: any) => {
            // Handle both string IDs and object attachments
            if (typeof att === 'string') {
              allAttachmentIds.push(att);
            } else if (att?.id) {
              allAttachmentIds.push(att.id);
            }
          });
        });

        // Batch fetch media records to get actual URLs
        let mediaMap: Record<string, any> = {};
        if (allAttachmentIds.length > 0) {
          const { data: mediaRecords, error: mediaError } = await supabase
            .from('sg_media')
            .select('id, public_url, mime_type, original_filename, thumbnail_url')
            .in('id', allAttachmentIds);

          if (!mediaError && mediaRecords) {
            mediaMap = mediaRecords.reduce((acc: any, m: any) => {
              acc[m.id] = {
                url: m.public_url,
                type: m.mime_type?.startsWith('video/') ? 'video' : 
                      m.mime_type?.startsWith('image/') ? 'image' : 'file',
                name: m.original_filename,
                thumbnail_url: m.thumbnail_url,
              };
              return acc;
            }, {});
          }
        }

        // Enrich messages with sender info and resolved attachments
        const enrichedMessages = messages.map((msg: any) => {
          // Resolve attachment IDs to full attachment objects
          const rawAttachments = msg.attachments || [];
          const resolvedAttachments = rawAttachments
            .map((att: any) => {
              const id = typeof att === 'string' ? att : att?.id;
              return id ? mediaMap[id] : null;
            })
            .filter(Boolean);
          
          if (msg.sender_type === 'customer') {
            return {
              ...msg,
              sender_name: customer_name,
              is_own_message: true,
              attachments: resolvedAttachments,
            };
          } else {
            const profile = userProfiles[msg.sender_id];
            return {
              ...msg,
              sender_name: profile?.full_name || profile?.email || 'Business',
              is_own_message: false,
              attachments: resolvedAttachments,
            };
          }
        });

        return new Response(
          JSON.stringify({ messages: enrichedMessages, conversation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // List all conversations for this customer
        console.log('[customer-messages-crud] Listing customer conversations');
        
        const { data: conversations, error } = await supabase
          .from('sg_conversations')
          .select(`
            id,
            title,
            created_at,
            updated_at
          `)
          .eq('customer_id', customer_id)
          .eq('business_id', business_id)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('[customer-messages-crud] Error fetching conversations:', error);
          throw error;
        }

        // Get last message for each conversation
        const conversationsWithPreview = await Promise.all(conversations.map(async (conv: any) => {
          const { data: lastMessage } = await supabase
            .from('sg_messages')
            .select('content, created_at, sender_type, attachments')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const hasAttachments = lastMessage?.attachments && Array.isArray(lastMessage.attachments) && lastMessage.attachments.length > 0;

          return {
            ...conv,
            last_message: lastMessage?.content || (hasAttachments ? null : null),
            last_message_at: lastMessage?.created_at || conv.created_at,
            last_message_from_customer: lastMessage?.sender_type === 'customer',
            has_attachments: hasAttachments,
          };
        }));

        return new Response(
          JSON.stringify({ conversations: conversationsWithPreview }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { content, attachments } = body;

      // Require either content or attachments
      const hasContent = content && content.trim();
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

      if (!hasContent && !hasAttachments) {
        return new Response(
          JSON.stringify({ error: 'Message content or attachments required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[customer-messages-crud] Sending message from customer');

      // Find or create conversation
      let targetConversationId = conversationId;
      
      if (!targetConversationId) {
        // Check for existing conversation
        const { data: existingConv } = await supabase
          .from('sg_conversations')
          .select('id')
          .eq('customer_id', customer_id)
          .eq('business_id', business_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (existingConv) {
          targetConversationId = existingConv.id;
        } else {
          // Get business owner_id for created_by (FK requires profiles.id)
          const { data: business, error: bizError } = await supabase
            .from('businesses')
            .select('owner_id')
            .eq('id', business_id)
            .single();

          if (bizError || !business) {
            console.error('[customer-messages-crud] Error fetching business owner:', bizError);
            throw new Error('Could not find business owner');
          }

          // Create new conversation - use business owner_id as created_by (FK constraint)
          const { data: newConv, error: convError } = await supabase
            .from('sg_conversations')
            .insert({
              business_id,
              customer_id,
              created_by: business.owner_id, // Use business owner for FK constraint
              title: `Chat with ${customer_name}`,
            })
            .select('id')
            .single();

          if (convError) {
            console.error('[customer-messages-crud] Error creating conversation:', convError);
            throw convError;
          }

          targetConversationId = newConv.id;
          console.log(`[customer-messages-crud] Created new conversation: ${targetConversationId}`);
        }
      }

      // Create the message
      const { data: message, error: msgError } = await supabase
        .from('sg_messages')
        .insert({
          conversation_id: targetConversationId,
          business_id, // Required field
          content: hasContent ? content.trim() : null,
          sender_id: customer_id,
          sender_type: 'customer',
          metadata: { customer_name },
          attachments: hasAttachments ? attachments : [],
        })
        .select()
        .single();

      if (msgError) {
        console.error('[customer-messages-crud] Error creating message:', msgError);
        throw msgError;
      }

      // Update sg_media records with conversation_id if attachments were uploaded before conversation existed
      if (hasAttachments && targetConversationId) {
        const { error: mediaUpdateError } = await supabase
          .from('sg_media')
          .update({ conversation_id: targetConversationId })
          .in('id', attachments)
          .is('conversation_id', null);

        if (mediaUpdateError) {
          console.warn('[customer-messages-crud] Failed to update media conversation_id:', mediaUpdateError.message);
        } else {
          console.log(`[customer-messages-crud] Updated ${attachments.length} media records with conversation_id`);
        }
      }

      // Update conversation updated_at
      await supabase
        .from('sg_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', targetConversationId);

      console.log(`[customer-messages-crud] Message created: ${message.id}`);

      return new Response(
        JSON.stringify({ 
          message: { 
            ...message, 
            sender_name: customer_name, 
            is_own_message: true 
          },
          conversation_id: targetConversationId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH: Edit customer message (15-minute window)
    if (req.method === 'PATCH') {
      const messageId = url.searchParams.get('messageId');
      if (!messageId) {
        return new Response(
          JSON.stringify({ error: 'Message ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { content } = body;

      if (!content || !content.trim()) {
        return new Response(
          JSON.stringify({ error: 'Message content required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[customer-messages-crud] Editing message: ${messageId}`);

      // Verify message exists and belongs to this customer
      const { data: existingMessage, error: fetchError } = await supabase
        .from('sg_messages')
        .select('id, created_at, sender_id, sender_type')
        .eq('id', messageId)
        .single();

      if (fetchError || !existingMessage) {
        return new Response(
          JSON.stringify({ error: 'Message not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Must be customer's own message
      if (existingMessage.sender_id !== customer_id || existingMessage.sender_type !== 'customer') {
        return new Response(
          JSON.stringify({ error: 'You can only edit your own messages' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check 15-minute window
      const minutesSinceCreation = (Date.now() - new Date(existingMessage.created_at).getTime()) / 60000;
      if (minutesSinceCreation > 15) {
        return new Response(
          JSON.stringify({ error: 'Messages can only be edited within 15 minutes of sending' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update message with edited flag
      const { data: updatedMessage, error: updateError } = await supabase
        .from('sg_messages')
        .update({ 
          content: content.trim(), 
          edited: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', messageId)
        .select()
        .single();

      if (updateError) {
        console.error('[customer-messages-crud] Error updating message:', updateError);
        throw updateError;
      }

      console.log(`[customer-messages-crud] Message edited: ${messageId}`);

      return new Response(
        JSON.stringify({ 
          message: { 
            ...updatedMessage, 
            sender_name: customer_name, 
            is_own_message: true 
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE: Delete customer message (15-minute window)
    if (req.method === 'DELETE') {
      const messageId = url.searchParams.get('messageId');
      if (!messageId) {
        return new Response(
          JSON.stringify({ error: 'Message ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[customer-messages-crud] Deleting message: ${messageId}`);

      // Verify message exists and belongs to this customer
      const { data: existingMessage, error: fetchError } = await supabase
        .from('sg_messages')
        .select('id, created_at, sender_id, sender_type')
        .eq('id', messageId)
        .single();

      if (fetchError || !existingMessage) {
        return new Response(
          JSON.stringify({ error: 'Message not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Must be customer's own message
      if (existingMessage.sender_id !== customer_id || existingMessage.sender_type !== 'customer') {
        return new Response(
          JSON.stringify({ error: 'You can only delete your own messages' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check 15-minute window
      const minutesSinceCreation = (Date.now() - new Date(existingMessage.created_at).getTime()) / 60000;
      if (minutesSinceCreation > 15) {
        return new Response(
          JSON.stringify({ error: 'Messages can only be deleted within 15 minutes of sending' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete the message
      const { error: deleteError } = await supabase
        .from('sg_messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) {
        console.error('[customer-messages-crud] Error deleting message:', deleteError);
        throw deleteError;
      }

      console.log(`[customer-messages-crud] Message deleted: ${messageId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[customer-messages-crud] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

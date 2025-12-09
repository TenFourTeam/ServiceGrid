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

        // Get messages
        const { data: messages, error: msgError } = await supabase
          .from('sg_messages')
          .select(`
            id,
            content,
            created_at,
            sender_id,
            sender_type,
            metadata
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('[customer-messages-crud] Error fetching messages:', msgError);
          throw msgError;
        }

        // Enrich messages with sender info
        const enrichedMessages = await Promise.all(messages.map(async (msg: any) => {
          if (msg.sender_type === 'customer') {
            return {
              ...msg,
              sender_name: customer_name,
              is_own_message: true,
            };
          } else {
            // Get profile info for business user
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', msg.sender_id)
              .single();

            return {
              ...msg,
              sender_name: profile?.full_name || profile?.email || 'Business',
              is_own_message: false,
            };
          }
        }));

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
            .select('content, created_at, sender_type')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            last_message: lastMessage?.content || null,
            last_message_at: lastMessage?.created_at || conv.created_at,
            last_message_from_customer: lastMessage?.sender_type === 'customer',
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
      const { content } = body;

      if (!content || !content.trim()) {
        return new Response(
          JSON.stringify({ error: 'Message content is required' }),
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
          // Create new conversation - use customer_id as created_by for customer-initiated conversations
          const { data: newConv, error: convError } = await supabase
            .from('sg_conversations')
            .insert({
              business_id,
              customer_id,
              created_by: customer_id, // Customer initiates
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
          content: content.trim(),
          sender_id: customer_id,
          sender_type: 'customer',
          metadata: { customer_name },
        })
        .select()
        .single();

      if (msgError) {
        console.error('[customer-messages-crud] Error creating message:', msgError);
        throw msgError;
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

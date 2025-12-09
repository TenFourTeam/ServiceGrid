import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface CustomerMessageAttachment {
  id: string;
  url: string;
  type: string;
  name?: string;
  thumbnail_url?: string;
}

export interface CustomerMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender_type: 'customer' | 'user';
  sender_name: string;
  is_own_message: boolean;
  edited?: boolean;
  metadata?: Record<string, any>;
  attachments?: CustomerMessageAttachment[];
}

export interface CustomerConversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_message_at: string;
  last_message_from_customer: boolean;
  has_attachments?: boolean;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-messages-crud`;

export function useCustomerConversations() {
  const { sessionToken, isAuthenticated } = useCustomerAuth();

  return useQuery({
    queryKey: ['customer-conversations'],
    queryFn: async (): Promise<CustomerConversation[]> => {
      if (!sessionToken) throw new Error('Not authenticated');

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch conversations');
      }

      const data = await response.json();
      return data.conversations || [];
    },
    enabled: isAuthenticated && !!sessionToken,
  });
}

export function useCustomerMessages(conversationId: string | null) {
  const { sessionToken, isAuthenticated } = useCustomerAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['customer-messages', conversationId],
    queryFn: async (): Promise<{ messages: CustomerMessage[]; conversation: any }> => {
      if (!sessionToken || !conversationId) throw new Error('Not authenticated or no conversation');

      const response = await fetch(`${EDGE_FUNCTION_URL}?conversationId=${conversationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch messages');
      }

      return await response.json();
    },
    enabled: isAuthenticated && !!sessionToken && !!conversationId,
    refetchInterval: 10000, // Poll every 10 seconds for new messages
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId || !isAuthenticated) return;

    const channel = supabase
      .channel(`customer-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'sg_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Invalidate queries when messages change
          queryClient.invalidateQueries({ queryKey: ['customer-messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isAuthenticated, queryClient]);

  return messagesQuery;
}

export function useSendCustomerMessage() {
  const { sessionToken } = useCustomerAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      content, 
      conversationId, 
      attachments 
    }: { 
      content: string; 
      conversationId?: string; 
      attachments?: string[];
    }) => {
      if (!sessionToken) throw new Error('Not authenticated');

      const url = conversationId 
        ? `${EDGE_FUNCTION_URL}?conversationId=${conversationId}`
        : EDGE_FUNCTION_URL;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({ content, attachments }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['customer-messages', data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
    },
  });
}

export function useEditCustomerMessage() {
  const { sessionToken } = useCustomerAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      messageId, 
      content,
      conversationId,
    }: { 
      messageId: string; 
      content: string;
      conversationId: string;
    }) => {
      if (!sessionToken) throw new Error('Not authenticated');

      const response = await fetch(`${EDGE_FUNCTION_URL}?messageId=${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to edit message');
      }

      return { ...(await response.json()), conversationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-messages', data.conversationId] });
    },
  });
}

export function useDeleteCustomerMessage() {
  const { sessionToken } = useCustomerAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      messageId,
      conversationId,
    }: { 
      messageId: string;
      conversationId: string;
    }) => {
      if (!sessionToken) throw new Error('Not authenticated');

      const response = await fetch(`${EDGE_FUNCTION_URL}?messageId=${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete message');
      }

      return { conversationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-messages', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
    },
  });
}

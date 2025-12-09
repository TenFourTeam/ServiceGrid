import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  business_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  mentions: string[];
  attachments: any[];
  sender_type?: 'user' | 'customer';
  customer_name?: string;
  sender?: {
    id: string;
    full_name: string;
  };
}

export function useMessages(conversationId: string | null) {
  const authApi = useAuthApi();
  const { businessId, userId } = useBusinessContext();
  const queryClient = useQueryClient();

  const messages = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await authApi.invoke(`messages-crud?conversationId=${conversationId}`, {
        method: 'GET',
      });

      if (error) throw error;

      return (data.messages || []) as Message[];
    },
    enabled: !!conversationId && !!businessId,
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`project:${conversationId}:chat`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'sg_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('[useMessages] Message event:', payload.eventType, payload);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations', businessId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, businessId]);

  // Mark conversation as read when messages are fetched
  useEffect(() => {
    if (!conversationId || !userId || !businessId) return;
    if (messages.isLoading || messages.data?.length === 0) return;

    // Mark as read using RPC function (bypasses type checking until types regenerate)
    const markAsRead = async () => {
      try {
        const { error } = await (supabase.rpc as any)('mark_conversation_read', {
          p_conversation_id: conversationId,
          p_user_id: userId,
        });
        
        if (error && !error.message?.includes('does not exist')) {
          console.error('[useMessages] Error marking conversation as read:', error);
        }
      } catch (error) {
        // Silently fail if RPC doesn't exist yet
      }
    };

    markAsRead();
  }, [conversationId, userId, businessId, messages.data?.length, messages.isLoading]);

  const sendMessage = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments?: any[] }) => {
      if (!conversationId) throw new Error('No conversation selected');

      const { data, error } = await authApi.invoke('messages-crud', {
        method: 'POST',
        body: { conversationId, content, attachments },
      });

      if (error) throw error;
      return data.message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', businessId] });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    },
  });

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { data, error } = await authApi.invoke(`messages-crud?messageId=${messageId}`, {
        method: 'PATCH',
        body: { content },
      });

      if (error) throw error;
      return data.message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
    onError: (error: any) => {
      console.error('Error editing message:', error);
      toast.error(error.message || 'Failed to edit message');
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await authApi.invoke(`messages-crud?messageId=${messageId}`, {
        method: 'DELETE',
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', businessId] });
    },
    onError: (error) => {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    },
  });

  return {
    messages: messages.data || [],
    isLoading: messages.isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    editMessage: editMessage.mutate,
    isEditing: editMessage.isPending,
    deleteMessage: deleteMessage.mutate,
    isDeleting: deleteMessage.isPending,
  };
}

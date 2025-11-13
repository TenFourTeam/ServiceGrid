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
  sender?: {
    id: string;
    full_name: string;
  };
}

export function useMessages(conversationId: string | null) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
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
          event: 'INSERT',
          schema: 'public',
          table: 'sg_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('[useMessages] New message:', payload);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations', businessId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, businessId]);

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

  return {
    messages: messages.data || [],
    isLoading: messages.isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
  };
}
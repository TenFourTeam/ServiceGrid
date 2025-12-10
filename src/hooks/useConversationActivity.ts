import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface ConversationActivityEvent {
  id: string;
  event_type: 'created' | 'reassigned' | 'archived' | 'unarchived';
  created_at: string;
  metadata?: {
    from_worker_id?: string | null;
    from_worker_name?: string | null;
    to_worker_id?: string | null;
    to_worker_name?: string | null;
    initial_worker_id?: string | null;
    initial_worker_name?: string | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export function useConversationActivity(conversationId: string | undefined) {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversation-activity', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await authApi.invoke(
        `conversation-activity?conversationId=${conversationId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return data?.events as ConversationActivityEvent[] || [];
    },
    enabled: !!conversationId,
  });

  // Real-time subscription for activity updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-activity:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sg_conversation_events',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['conversation-activity', conversationId] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

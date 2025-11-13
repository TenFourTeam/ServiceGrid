import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface UnreadMention {
  id: string;
  conversation_id: string;
  content: string;
  sender_name: string;
  created_at: string;
}

/**
 * Hook to track unread mentions for the current user
 */
export function useUnreadMentions() {
  const authApi = useAuthApi();
  const { businessId, userId } = useBusinessContext();
  const queryClient = useQueryClient();

  const query = useQuery<UnreadMention[]>({
    queryKey: ['unread-mentions', businessId, userId],
    queryFn: async () => {
      if (!businessId || !userId) return [];

      const { data, error } = await authApi.invoke('messages-crud?action=unreadMentions', {
        method: 'GET',
        headers: { 'x-business-id': businessId }
      });

      if (error) {
        console.error('[useUnreadMentions] Error fetching:', error);
        return [];
      }

      return data?.mentions || [];
    },
    enabled: !!businessId && !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000, // Refetch every minute
  });

  // Set up realtime subscription for new mentions
  useEffect(() => {
    if (!businessId || !userId) return;

    const channel = supabase
      .channel(`mentions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sg_messages',
          filter: `mentions.cs.{${userId}}`, // Contains userId in mentions array
        },
        (payload) => {
          console.log('[useUnreadMentions] New mention received:', payload);
          
          // Show toast notification
          const message = payload.new as any;
          toast.info(`You were mentioned by ${message.sender_name || 'someone'}`, {
            description: message.content?.slice(0, 50) + (message.content?.length > 50 ? '...' : ''),
            action: {
              label: 'View',
              onClick: () => {
                // Navigate to conversation (you can enhance this with router)
                window.location.href = `/team?tab=chat&conversation=${message.conversation_id}`;
              },
            },
          });

          // Invalidate query to refetch count
          queryClient.invalidateQueries({ queryKey: ['unread-mentions', businessId, userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, userId, queryClient]);

  return {
    unreadMentions: query.data || [],
    unreadCount: query.data?.length || 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

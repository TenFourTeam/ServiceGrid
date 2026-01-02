import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { useAuthApi } from './useAuthApi';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  lastWeek: Conversation[];
  older: Conversation[];
}

export function useAIConversations() {
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  const conversations = useQuery({
    queryKey: ['ai-conversations', businessId],
    queryFn: async (): Promise<GroupedConversations> => {
      if (!businessId) return { today: [], yesterday: [], lastWeek: [], older: [] };

      const { data, error } = await authApi.invoke('ai-conversations-crud', {
        method: 'GET',
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch conversations');
      }

      const conversations = (data || []) as Conversation[];

      // Group by relative time
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const grouped: GroupedConversations = {
        today: [],
        yesterday: [],
        lastWeek: [],
        older: [],
      };

      conversations?.forEach(conv => {
        const convDate = new Date(conv.created_at);
        if (convDate >= today) {
          grouped.today.push(conv);
        } else if (convDate >= yesterday) {
          grouped.yesterday.push(conv);
        } else if (convDate >= lastWeek) {
          grouped.lastWeek.push(conv);
        } else {
          grouped.older.push(conv);
        }
      });

      return grouped;
    },
    enabled: !!businessId,
  });

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await authApi.invoke('ai-conversations-crud', {
        method: 'DELETE',
        queryParams: { id: conversationId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete conversation');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations', businessId] });
      toast.success('Conversation deleted');
    },
    onError: (error) => {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    },
  });

  return {
    conversations: conversations.data || { today: [], yesterday: [], lastWeek: [], older: [] },
    isLoading: conversations.isLoading,
    deleteConversation: deleteConversation.mutate,
  };
}

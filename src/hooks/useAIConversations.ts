import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useAIConversations() {
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  const conversations = useQuery({
    queryKey: ['ai-conversations', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('id, title, created_at, updated_at')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Group by relative time
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const grouped = {
        today: [] as Conversation[],
        yesterday: [] as Conversation[],
        lastWeek: [] as Conversation[],
        older: [] as Conversation[],
      };

      data?.forEach(conv => {
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
      const { error } = await supabase
        .from('ai_chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
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

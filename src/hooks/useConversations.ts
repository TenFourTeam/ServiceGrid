import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { toast } from 'sonner';

export interface Conversation {
  id: string;
  business_id: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_archived: boolean;
  latest_message?: string;
  latest_sender_name?: string;
  latest_sender_type?: 'user' | 'customer';
  unread_count?: number;
  customer_id?: string;
  customer_name?: string;
  job_id?: string;
  job_title?: string;
  assigned_worker_id?: string;
  assigned_worker_name?: string;
}

export function useConversations() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  const conversations = useQuery({
    queryKey: ['conversations', businessId],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('conversations-crud', {
        method: 'GET',
      });

      if (error) throw error;

      return (data.conversations || []) as Conversation[];
    },
    enabled: !!businessId,
  });

  const createConversation = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await authApi.invoke('conversations-crud', {
        method: 'POST',
        body: { title },
      });

      if (error) throw error;
      return data.conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', businessId] });
      toast.success('Conversation created');
    },
    onError: (error) => {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    },
  });

  const createCustomerConversation = useMutation({
    mutationFn: async ({ customerId, customerName, initialReference, jobId, workerId }: { 
      customerId: string; 
      customerName: string; 
      initialReference?: { type: 'job' | 'quote' | 'invoice'; id: string; title: string };
      jobId?: string;
      workerId?: string;
    }) => {
      const metadata = initialReference ? { references: [initialReference] } : undefined;
      
      const { data, error } = await authApi.invoke('conversations-crud', {
        method: 'POST',
        body: { 
          customerId,
          title: customerName,
          metadata,
          jobId,
          workerId,
        },
      });

      if (error) throw error;
      return { conversation: data.conversation, existed: data.existed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', businessId] });
      if (result.existed) {
        toast.info('Opened existing conversation');
      }
    },
    onError: (error) => {
      console.error('Error creating customer conversation:', error);
      toast.error('Failed to create customer chat');
    },
  });

  const archiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await authApi.invoke(`conversations-crud?conversationId=${conversationId}`, {
        method: 'PATCH',
        body: { is_archived: true },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', businessId] });
      toast.success('Conversation archived');
    },
    onError: (error) => {
      console.error('Error archiving conversation:', error);
      toast.error('Failed to archive conversation');
    },
  });

  const reassignConversation = useMutation({
    mutationFn: async ({ conversationId, workerId }: { 
      conversationId: string; 
      workerId: string | null;
    }) => {
      const { data, error } = await authApi.invoke(`conversations-crud?conversationId=${conversationId}`, {
        method: 'PATCH',
        body: { assigned_worker_id: workerId },
      });

      if (error) throw error;
      return data.conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', businessId] });
      toast.success('Conversation reassigned');
    },
    onError: (error) => {
      console.error('Error reassigning conversation:', error);
      toast.error('Failed to reassign conversation');
    },
  });

  return {
    conversations: conversations.data || [],
    isLoading: conversations.isLoading,
    createConversation: createConversation.mutate,
    createCustomerConversation: createCustomerConversation.mutate,
    archiveConversation: archiveConversation.mutate,
    reassignConversation: reassignConversation.mutate,
  };
}
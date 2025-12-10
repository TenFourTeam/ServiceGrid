import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { toast } from 'sonner';
import type { ConversationActivityEvent } from '@/hooks/useConversationActivity';

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

interface OptimisticEventContext {
  currentUser: { id: string; name: string | null; email: string };
  fromWorkerName?: string | null;
  toWorkerName?: string | null;
}

function createOptimisticEvent(
  eventType: ConversationActivityEvent['event_type'],
  currentUser: { id: string; name: string | null; email: string },
  metadata?: ConversationActivityEvent['metadata']
): ConversationActivityEvent {
  return {
    id: `optimistic-${Date.now()}`,
    event_type: eventType,
    created_at: new Date().toISOString(),
    metadata,
    user: currentUser,
  };
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
    mutationFn: async ({ conversationId, optimisticContext }: { 
      conversationId: string;
      optimisticContext?: OptimisticEventContext;
    }) => {
      // Add optimistic event immediately
      if (optimisticContext) {
        const optimisticEvent = createOptimisticEvent(
          'archived',
          optimisticContext.currentUser
        );
        queryClient.setQueryData<ConversationActivityEvent[]>(
          ['conversation-activity', conversationId],
          (old = []) => [optimisticEvent, ...old]
        );
      }

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
    onError: (error, variables) => {
      console.error('Error archiving conversation:', error);
      // Rollback optimistic event on error
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-activity', variables.conversationId] 
      });
      toast.error('Failed to archive conversation');
    },
  });

  const unarchiveConversation = useMutation({
    mutationFn: async ({ conversationId, optimisticContext }: { 
      conversationId: string;
      optimisticContext?: OptimisticEventContext;
    }) => {
      // Add optimistic event immediately
      if (optimisticContext) {
        const optimisticEvent = createOptimisticEvent(
          'unarchived',
          optimisticContext.currentUser
        );
        queryClient.setQueryData<ConversationActivityEvent[]>(
          ['conversation-activity', conversationId],
          (old = []) => [optimisticEvent, ...old]
        );
      }

      const { error } = await authApi.invoke(`conversations-crud?conversationId=${conversationId}`, {
        method: 'PATCH',
        body: { is_archived: false },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', businessId] });
      toast.success('Conversation restored');
    },
    onError: (error, variables) => {
      console.error('Error restoring conversation:', error);
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-activity', variables.conversationId] 
      });
      toast.error('Failed to restore conversation');
    },
  });

  const reassignConversation = useMutation({
    mutationFn: async ({ conversationId, workerId, optimisticContext }: { 
      conversationId: string; 
      workerId: string | null;
      optimisticContext?: OptimisticEventContext;
    }) => {
      // Add optimistic event immediately
      if (optimisticContext) {
        const optimisticEvent = createOptimisticEvent(
          'reassigned',
          optimisticContext.currentUser,
          {
            from_worker_name: optimisticContext.fromWorkerName,
            to_worker_name: optimisticContext.toWorkerName,
          }
        );
        queryClient.setQueryData<ConversationActivityEvent[]>(
          ['conversation-activity', conversationId],
          (old = []) => [optimisticEvent, ...old]
        );
      }

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
    onError: (error, variables) => {
      console.error('Error reassigning conversation:', error);
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-activity', variables.conversationId] 
      });
      toast.error('Failed to reassign conversation');
    },
  });

  return {
    conversations: conversations.data || [],
    isLoading: conversations.isLoading,
    createConversation: createConversation.mutate,
    createCustomerConversation: createCustomerConversation.mutate,
    archiveConversation: archiveConversation.mutate,
    unarchiveConversation: unarchiveConversation.mutate,
    reassignConversation: reassignConversation.mutate,
  };
}
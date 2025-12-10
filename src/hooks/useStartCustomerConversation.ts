import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface StartConversationParams {
  jobId?: string;
  workerId?: string;
  workerName?: string;
  jobTitle?: string;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-messages-crud`;

export function useStartCustomerConversation() {
  const { sessionToken } = useCustomerAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ jobId, workerId, workerName, jobTitle }: StartConversationParams) => {
      if (!sessionToken) throw new Error('Not authenticated');

      const response = await fetch(`${EDGE_FUNCTION_URL}?action=startConversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({ jobId, workerId, workerName, jobTitle }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start conversation');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
      navigate('/portal/messages', { state: { conversationId: data.conversation_id } });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

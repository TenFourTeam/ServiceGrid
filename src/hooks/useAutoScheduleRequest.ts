import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { queryKeys } from '@/queries/keys';
import { toast } from 'sonner';

export function useAutoScheduleRequest() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId, userId } = useBusinessContext();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      console.info('[useAutoScheduleRequest] Auto-scheduling request:', requestId);

      const { data, error } = await authApi.invoke('auto-schedule-request', {
        method: 'POST',
        body: { requestId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to auto-schedule request');
      }

      return data;
    },
    onSuccess: (data) => {
      console.info('[useAutoScheduleRequest] Success:', data);
      
      // Invalidate both requests and jobs queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: queryKeys.data.requests(businessId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId || '', userId || '') });

      toast.success('Request auto-scheduled successfully', {
        description: `Job scheduled for ${new Date(data.job.starts_at).toLocaleString()}`
      });
    },
    onError: (error: Error) => {
      console.error('[useAutoScheduleRequest] Error:', error);
      toast.error('Failed to auto-schedule request', {
        description: error.message
      });
    }
  });
}

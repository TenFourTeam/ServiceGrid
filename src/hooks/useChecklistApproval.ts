import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { toast } from 'sonner';

export function useChecklistApproval() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const approve = useMutation({
    mutationFn: async ({ checklistId, jobId }: { checklistId: string; jobId: string }) => {
      const { data, error } = await authApi.invoke(`checklists-crud/${checklistId}/approve`, {
        method: 'PATCH',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-checklist', variables.jobId] });
      toast.success('Checklist approved and activated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve checklist');
    },
  });

  const reject = useMutation({
    mutationFn: async ({
      checklistId,
      jobId,
      reason,
    }: {
      checklistId: string;
      jobId: string;
      reason?: string;
    }) => {
      const { data, error } = await authApi.invoke(`checklists-crud/${checklistId}/reject`, {
        method: 'PATCH',
        body: { reason },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-checklist', variables.jobId] });
      toast.success('Checklist rejected');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject checklist');
    },
  });

  return { approve, reject };
}

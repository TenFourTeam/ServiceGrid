import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { toast } from 'sonner';

interface UnifiedAssignment {
  assignment_type: 'job' | 'checklist_item';
  job_id: string;
  user_id: string;
  assigned_at: string;
  checklist_id: string | null;
  item_id: string | null;
  business_id: string;
  job_title: string;
  item_title: string | null;
}

export function useUnifiedAssignments(filters?: { userId?: string; jobId?: string; type?: string }) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  const query = useQuery<UnifiedAssignment[]>({
    queryKey: ['unified-assignments', businessId, filters],
    queryFn: async () => {
      if (!businessId) return [];

      const params = new URLSearchParams();
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.jobId) params.append('jobId', filters.jobId);
      if (filters?.type) params.append('type', filters.type);

      const { data, error } = await authApi.invoke('unified-assignments', {
        method: 'GET',
        queryParams: Object.fromEntries(params),
        headers: {
          'x-business-id': businessId
        }
      });

      if (error) throw new Error(error.message || 'Failed to fetch assignments');
      return data.assignments || [];
    },
    enabled: !!businessId,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ 
      jobId, 
      userIds, 
      assignToChecklists = true 
    }: { 
      jobId: string; 
      userIds: string[]; 
      assignToChecklists?: boolean;
    }) => {
      const { data, error } = await authApi.invoke('unified-assignments', {
        method: 'POST',
        body: { jobId, userIds, assignToChecklists },
        headers: {
          'x-business-id': businessId
        }
      });

      if (error) throw new Error(error.message || 'Failed to assign users');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-assignments', businessId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-checklist-tasks'] });
      toast.success('Users assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign users');
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async ({ 
      jobId, 
      userIds, 
      removeFromChecklists = true 
    }: { 
      jobId: string; 
      userIds: string[]; 
      removeFromChecklists?: boolean;
    }) => {
      const { data, error } = await authApi.invoke('unified-assignments', {
        method: 'DELETE',
        body: { jobId, userIds, removeFromChecklists },
        headers: {
          'x-business-id': businessId
        }
      });

      if (error) throw new Error(error.message || 'Failed to unassign users');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-assignments', businessId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-checklist-tasks'] });
      toast.success('Users unassigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unassign users');
    },
  });

  return {
    ...query,
    assign: assignMutation.mutateAsync,
    unassign: unassignMutation.mutateAsync,
    isAssigning: assignMutation.isPending,
    isUnassigning: unassignMutation.isPending,
  };
}

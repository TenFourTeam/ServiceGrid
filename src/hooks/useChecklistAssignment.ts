import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';

/**
 * Hook for assigning checklists and items to team members
 */
export function useChecklistAssignment() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const assignChecklist = useMutation({
    mutationFn: async ({ checklistId, assignedTo }: { checklistId: string; assignedTo: string | null }) => {
      const { data, error } = await authApi.invoke(`checklists-crud/${checklistId}/assign`, {
        method: 'PATCH',
        body: { assignedTo },
      });
      
      if (error) throw new Error(error.message || 'Failed to assign checklist');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['my-checklist-tasks'] });
      toast.success('Checklist assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign checklist');
    },
  });

  const assignItem = useMutation({
    mutationFn: async ({ itemId, assignedTo }: { itemId: string; assignedTo: string | null }) => {
      const { data, error } = await authApi.invoke(`checklists-crud/items/${itemId}/assign`, {
        method: 'PATCH',
        body: { assignedTo },
      });
      
      if (error) throw new Error(error.message || 'Failed to assign item');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['my-checklist-tasks'] });
      toast.success('Task assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign task');
    },
  });

  return {
    assignChecklist,
    assignItem,
    isAssigning: assignChecklist.isPending || assignItem.isPending,
  };
}

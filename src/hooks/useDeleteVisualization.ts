import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { queryKeys } from '@/queries/keys';
import { toast } from 'sonner';

/**
 * Hook to delete a visualization (media item)
 */
export function useDeleteVisualization() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await authApi.invoke(`job-media-crud?mediaId=${mediaId}`, {
        method: 'DELETE'
      });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all visualization queries
      queryClient.invalidateQueries({ 
        queryKey: ['visualizations']
      });
      toast.success('Visualization deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete visualization', {
        description: error.message
      });
    }
  });
}

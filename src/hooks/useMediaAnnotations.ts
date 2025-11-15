import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import { Annotation } from '@/hooks/useJobMedia';

export function useUpdateMediaAnnotations() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, annotations }: { mediaId: string; annotations: Annotation[] }) => {
      const { data, error } = await authApi.invoke('update-media-annotations', {
        method: 'POST',
        body: { mediaId, annotations }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-media'] });
      toast.success('Annotations saved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to save annotations', { description: error.message });
    }
  });
}

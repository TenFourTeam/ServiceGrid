import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';

export function useUpdateMediaTags() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, tags }: { mediaId: string; tags: string[] }) => {
      const { data, error } = await authApi.invoke('update-media-tags', {
        method: 'POST',
        body: { mediaId, tags }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-media'] });
      toast.success('Tags updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update tags', { description: error.message });
    }
  });
}

export function useBulkUpdateMediaTags() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaIds, tags }: { mediaIds: string[]; tags: string[] }) => {
      const { data, error } = await authApi.invoke('bulk-update-media-tags', {
        method: 'POST',
        body: { mediaIds, tags }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-media'] });
      toast.success(`${data.updated} items tagged successfully`);
    },
    onError: (error: any) => {
      toast.error('Failed to update tags', { description: error.message });
    }
  });
}

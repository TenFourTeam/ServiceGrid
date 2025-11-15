import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useToast } from '@/hooks/useToast';

export function useUpdateMediaTags() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({ title: 'Tags updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update tags', description: error.message, variant: 'destructive' });
    }
  });
}

export function useBulkUpdateMediaTags() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({ title: `${data.updated} items tagged successfully` });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update tags', description: error.message, variant: 'destructive' });
    }
  });
}

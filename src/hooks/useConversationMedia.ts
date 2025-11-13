import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { MediaItem } from '@/hooks/useJobMedia';

export function useConversationMedia(mediaIds: string[] | undefined) {
  const authApi = useAuthApi();
  
  return useQuery({
    queryKey: ['conversation-media', mediaIds],
    queryFn: async () => {
      if (!mediaIds || mediaIds.length === 0) return [];

      const { data, error } = await authApi.invoke(
        `conversation-media-fetch?mediaIds=${mediaIds.join(',')}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return (data?.media || []) as MediaItem[];
    },
    enabled: !!mediaIds && mediaIds.length > 0,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

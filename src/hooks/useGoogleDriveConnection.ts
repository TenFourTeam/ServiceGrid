import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { GoogleDriveConnection, DriveHealthMetrics } from '@/types/googleDrive';

export function useGoogleDriveConnection() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  // Listen for OAuth callback success messages from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify message origin for security
      if (event.origin !== window.location.origin) return;

      const { type, businessId: messageBizId, error } = event.data;

      if (type === 'google-drive-oauth-success') {
        // Invalidate queries to fetch new connection data
        queryClient.invalidateQueries({ queryKey: ['google-drive', 'connection', messageBizId] });
        queryClient.invalidateQueries({ queryKey: ['google-drive', 'health', messageBizId] });
        toast.success('Google Drive connected successfully!');
      } else if (type === 'google-drive-oauth-error') {
        toast.error(`Connection failed: ${error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient]);

  const connectionQuery = useQuery<GoogleDriveConnection | null>({
    queryKey: ['google-drive', 'connection', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('google-drive-health-check', {
        method: 'POST',
        body: {}
      });

      if (error) throw new Error(error.message);
      
      return data.isConnected ? data as GoogleDriveConnection : null;
    },
  });

  const healthQuery = useQuery<DriveHealthMetrics>({
    queryKey: ['google-drive', 'health', businessId],
    enabled: !!businessId && !!connectionQuery.data,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('google-drive-health-check', {
        method: 'POST',
        body: {}
      });

      if (error) throw new Error(error.message);
      return data as DriveHealthMetrics;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const connect = useMutation({
    mutationFn: async () => {
      const { data, error } = await authApi.invoke('google-drive-oauth', {
        method: 'GET',
        queryParams: { action: 'connect' }
      });

      if (error) throw new Error(error.message);
      
      // Open OAuth window
      if (data.url) {
        window.open(data.url, '_blank', 'width=600,height=700');
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Opening Google Drive authorization...');
      // Connection will be finalized via OAuth callback
    },
    onError: (error: Error) => {
      toast.error(`Connection failed: ${error.message}`);
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await authApi.invoke('google-drive-disconnect', {
        method: 'POST',
        body: {}
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'connection', businessId] });
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'health', businessId] });
      toast.success('Google Drive disconnected');
    },
    onError: (error: Error) => {
      toast.error(`Disconnect failed: ${error.message}`);
    },
  });

  return {
    connection: connectionQuery.data,
    health: healthQuery.data,
    isLoading: connectionQuery.isLoading,
    isConnected: !!connectionQuery.data?.is_active,
    connect: connect.mutate,
    disconnect: disconnect.mutate,
    isConnecting: connect.isPending,
    isDisconnecting: disconnect.isPending,
  };
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { DriveShareOptions } from '@/types/googleDrive';

export function useGoogleDriveSharing() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const createShareLink = useMutation({
    mutationFn: async (params: { driveFileId: string; role: 'reader' | 'writer' }) => {
      const { data, error } = await authApi.invoke('google-drive-create-share-link', {
        method: 'POST',
        body: params
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast.success('Share link created');
      // Copy to clipboard
      if (data.shareLink) {
        navigator.clipboard.writeText(data.shareLink);
        toast.success('Link copied to clipboard');
      }
    },
    onError: (error: Error) => {
      toast.error(`Share link creation failed: ${error.message}`);
    },
  });

  const shareWithEmail = useMutation({
    mutationFn: async (params: DriveShareOptions) => {
      const { data, error } = await authApi.invoke('google-drive-share-with-email', {
        method: 'POST',
        body: params
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('File shared successfully');
    },
    onError: (error: Error) => {
      toast.error(`Sharing failed: ${error.message}`);
    },
  });

  const shareWithTeam = useMutation({
    mutationFn: async (params: { jobId: string; teamMemberIds: string[]; role: 'reader' | 'writer' }) => {
      const { data, error } = await authApi.invoke('google-drive-share-with-team', {
        method: 'POST',
        body: params
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Shared with ${data.sharedWith?.length || 0} team members`);
    },
    onError: (error: Error) => {
      toast.error(`Team sharing failed: ${error.message}`);
    },
  });

  const revokeAccess = useMutation({
    mutationFn: async (params: { driveFileId: string; permissionId: string }) => {
      const { data, error } = await authApi.invoke('google-drive-revoke-access', {
        method: 'POST',
        body: params
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Access revoked');
    },
    onError: (error: Error) => {
      toast.error(`Revoke failed: ${error.message}`);
    },
  });

  const getAccessLog = useQuery({
    queryKey: ['google-drive', 'access-log', businessId],
    enabled: false, // Only fetch when explicitly requested
    queryFn: async () => {
      const { data, error } = await authApi.invoke('google-drive-get-access-log', {
        method: 'POST',
        body: {}
      });

      if (error) throw new Error(error.message);
      return data.permissions || [];
    },
  });

  return {
    createShareLink: createShareLink.mutate,
    shareWithEmail: shareWithEmail.mutate,
    shareWithTeam: shareWithTeam.mutate,
    revokeAccess: revokeAccess.mutate,
    getAccessLog: getAccessLog.refetch,
    accessLog: getAccessLog.data,
    isSharing: createShareLink.isPending || shareWithEmail.isPending || shareWithTeam.isPending,
  };
}

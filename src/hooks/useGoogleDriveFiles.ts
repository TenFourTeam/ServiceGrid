import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { DriveFile, GoogleDriveFileMapping } from '@/types/googleDrive';

export function useGoogleDriveFiles() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const listFiles = useQuery<DriveFile[]>({
    queryKey: ['google-drive', 'files', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('google-drive-list-files', {
        method: 'POST',
        body: {}
      });

      if (error) throw new Error(error.message);
      return data.files || [];
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (params: {
      entityType: string;
      entityId: string;
      fileName: string;
      fileUrl: string;
      mimeType: string;
      folderId?: string;
    }) => {
      const { data, error } = await authApi.invoke('google-drive-upload-file', {
        method: 'POST',
        body: params
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'files', businessId] });
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'file-mappings', businessId] });
      toast.success('File uploaded to Google Drive');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const importDocument = useMutation({
    mutationFn: async (params: {
      driveFileId: string;
      entityType: string;
      entityId: string;
    }) => {
      const { data, error } = await authApi.invoke('google-drive-import-document', {
        method: 'POST',
        body: params
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Document imported from Google Drive');
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  return {
    files: listFiles.data || [],
    isLoading: listFiles.isLoading,
    uploadFile: uploadFile.mutate,
    importDocument: importDocument.mutate,
    isUploading: uploadFile.isPending,
    isImporting: importDocument.isPending,
  };
}

export function useGoogleDriveFileMappings(entityType?: string, entityId?: string) {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();

  return useQuery<GoogleDriveFileMapping[]>({
    queryKey: ['google-drive', 'file-mappings', businessId, entityType, entityId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('google-drive-get-file-mappings', {
        method: 'POST',
        body: { entityType, entityId }
      });

      if (error) throw new Error(error.message);
      return data.mappings || [];
    },
  });
}

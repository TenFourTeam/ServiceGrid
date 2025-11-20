import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { DriveFolderStructure } from '@/types/googleDrive';

export function useGoogleDriveFolders() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const createFolderStructure = useMutation({
    mutationFn: async (params: { customerId: string; jobId?: string }) => {
      const { data, error } = await authApi.invoke('google-drive-create-folder-structure', {
        method: 'POST',
        body: params
      });

      if (error) throw new Error(error.message);
      return data.structure as DriveFolderStructure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'files', businessId] });
      toast.success('Folder structure created in Google Drive');
    },
    onError: (error: Error) => {
      toast.error(`Folder creation failed: ${error.message}`);
    },
  });

  return {
    createFolderStructure: createFolderStructure.mutate,
    isCreating: createFolderStructure.isPending,
  };
}

import { useAuth } from '@clerk/clerk-react';
import { queryKeys } from '@/queries/keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

export type LogoKind = 'dark' | 'light';

export type LogoUploadPayload = {
  file: File;
  kind: LogoKind;
};

/**
 * Unified logo upload operations hook
 * Handles both dark and light logo uploads with consistent error handling
 */
export function useLogoOperations() {
  const { isSignedIn, getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();

  const uploadLogo = useMutation({
    mutationFn: async ({ file, kind }: LogoUploadPayload) => {
      if (!isSignedIn) {
        throw new Error('You must be signed in');
      }
      
      if (!file) {
        throw new Error('Please choose an image file');
      }

      const form = new FormData();
      form.append('file', file);
      
      // For FormData, we need to pass it directly and let the authApi handle headers
      const { data, error } = await authApi.invoke(`upload-business-logo?kind=${kind}`, {
        method: 'POST',
        body: form,
        headers: {} // Let browser set Content-Type for FormData
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to upload logo');
      }
      
      return data as { url: string; kind: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.business.current() });
      toast.success('Logo updated successfully');
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || 'Failed to upload logo. Please try again.');
    },
  });

  return {
    uploadLogo,
    isUploading: uploadLogo.isPending,
  };
}
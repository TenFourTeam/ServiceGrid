import { useStandardMutation } from '@/mutations/useStandardMutation';
import { useAuth } from '@clerk/clerk-react';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys } from '@/queries/keys';

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
  const { isSignedIn } = useAuth();

  const uploadLogo = useStandardMutation<{ url: string; kind: string }, LogoUploadPayload>({
    mutationFn: async ({ file, kind }: LogoUploadPayload) => {
      if (!isSignedIn) {
        throw new Error('You must be signed in');
      }
      
      if (!file) {
        throw new Error('Please choose an image file');
      }

      const form = new FormData();
      form.append('file', file);
      
      const result = await edgeRequest(fn(`upload-business-logo?kind=${kind}`), {
        method: 'POST',
        body: form,
      });
      
      return result as { url: string; kind: string };
    },
    invalidateQueries: [[...queryKeys.business.current()]],
    successMessage: 'Logo updated successfully',
    errorMessage: 'Failed to upload logo. Please try again.',
  });

  return {
    uploadLogo,
    isUploading: uploadLogo.isPending,
  };
}
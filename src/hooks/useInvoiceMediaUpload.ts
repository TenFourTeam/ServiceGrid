import { useState } from 'react';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';

interface UploadResult {
  url: string;
  mediaId: string;
  isDuplicate?: boolean;
}

export function useInvoiceMediaUpload() {
  const authApi = useAuthApi();
  const { business } = useBusinessContext();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMedia = async (file: File): Promise<UploadResult> => {
    if (!business?.id) {
      throw new Error('No business context');
    }

    setUploading(true);
    setProgress(0);

    try {
      // Calculate content hash for deduplication
      const arrayBuffer = await file.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
      const contentHash = CryptoJS.SHA256(wordArray).toString();

      setProgress(30);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', business.id);
      formData.append('contentHash', contentHash);

      setProgress(50);

      // Upload via edge function
      const { data, error } = await authApi.invoke('upload-invoice-media', {
        method: 'POST',
        body: formData,
      });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      setProgress(100);

      if (data.isDuplicate) {
        toast.info('This image was already uploaded');
      }

      return {
        url: data.url,
        mediaId: data.mediaId,
        isDuplicate: data.isDuplicate
      };

    } catch (error) {
      console.error('Invoice media upload failed:', error);
      toast.error('Failed to upload image');
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadMedia,
    uploading,
    progress
  };
}

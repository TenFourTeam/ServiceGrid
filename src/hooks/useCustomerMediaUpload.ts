import { useState } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

interface UploadOptions {
  conversationId: string | null;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  mediaId: string;
  url: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  isDuplicate: boolean;
}

const SUPPORTED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/svg+xml',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function useCustomerMediaUpload() {
  const { sessionToken } = useCustomerAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMedia = async (file: File, options: UploadOptions): Promise<UploadResult> => {
    const { conversationId, onProgress } = options;

    if (!sessionToken) {
      throw new Error('Not authenticated');
    }

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported: images and videos`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File too large. Maximum size is 100MB');
    }

    setUploading(true);
    setProgress(0);

    try {
      onProgress?.(10);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      onProgress?.(30);

      // Upload to edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-upload-media`,
        {
          method: 'POST',
          headers: {
            'x-session-token': sessionToken
          },
          body: formData
        }
      );

      onProgress?.(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      onProgress?.(100);
      setProgress(100);

      return {
        mediaId: result.mediaId,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        isDuplicate: result.isDuplicate || false
      };

    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return {
    uploadMedia,
    uploading,
    progress
  };
}

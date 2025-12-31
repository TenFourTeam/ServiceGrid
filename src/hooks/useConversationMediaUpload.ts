import { useState } from 'react';
import { useAuth } from '@/hooks/useBusinessAuth';
import { useBusinessContext } from '@/hooks/useBusinessContext';

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

export function useConversationMediaUpload() {
  const { getToken } = useAuth();
  const { businessId } = useBusinessContext();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMedia = async (file: File, options: UploadOptions): Promise<UploadResult> => {
    const { conversationId, onProgress } = options;

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported types: images and videos`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File too large. Maximum size is 100MB');
    }

    if (!businessId) {
      throw new Error('Business context required');
    }

    setUploading(true);
    setProgress(0);

    try {
      // Update progress as we process
      onProgress?.(10);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      onProgress?.(30);

      // Upload to edge function
      const token = await getToken();
      const response = await fetch(
        `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/upload-conversation-media`,
        {
          method: 'POST',
          headers: {
            'x-session-token': token || '',
            'x-business-id': businessId
          },
          body: formData
        }
      );

      onProgress?.(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Upload failed: ${response.statusText}`;
        
        // Add more context for specific error codes
        if (response.status === 413) {
          throw new Error('File too large. Maximum size is 100MB');
        } else if (response.status === 415) {
          throw new Error('Unsupported file type. Please use images or videos');
        } else if (response.status === 500 && errorData.details) {
          console.error('Server error details:', errorData.details);
          throw new Error(`Server error: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
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

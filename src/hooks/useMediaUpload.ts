import { useState } from 'react';
import { useAuthApi } from '@/hooks/useAuthApi';
import exifr from 'exifr';
import CryptoJS from 'crypto-js';

interface UploadOptions {
  jobId: string;
  businessId: string;
  checklistItemId?: string;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  url: string;
  path: string;
  mediaId?: string;
  isDuplicate?: boolean;
}

export function useMediaUpload() {
  const authApi = useAuthApi();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMedia = async (
    file: File, 
    options: UploadOptions
  ): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      // 1. Validate file type
      const isPhoto = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isPhoto && !isVideo) {
        throw new Error('Only images and videos are supported');
      }

      // 2. Validate file size
      const maxSize = isPhoto ? 10 * 1024 * 1024 : 500 * 1024 * 1024; // 10MB / 500MB
      if (file.size > maxSize) {
        throw new Error(`File too large. Max size: ${isPhoto ? '10MB' : '500MB'}`);
      }

      // 3. Extract EXIF/GPS data (photos only)
      let exifData = null;
      let gpsData = null;
      
      if (isPhoto) {
        try {
          const exif = await exifr.parse(file, { 
            pick: ['Make', 'Model', 'DateTime', 'Orientation', 'GPS']
          });
          
          if (exif) {
            gpsData = exif.latitude && exif.longitude ? {
              latitude: exif.latitude,
              longitude: exif.longitude
            } : null;
            
            exifData = {
              make: exif.Make,
              model: exif.Model,
              dateTime: exif.DateTime,
              orientation: exif.Orientation
            };
          }
        } catch (err) {
          console.warn('EXIF extraction failed:', err);
        }
      }

      // 4. Calculate content hash for deduplication
      const arrayBuffer = await file.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
      const contentHash = CryptoJS.SHA256(wordArray).toString();

      // 5. Prepare FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobId', options.jobId);
      formData.append('businessId', options.businessId);
      formData.append('contentHash', contentHash);
      
      if (options.checklistItemId) {
        formData.append('checklistItemId', options.checklistItemId);
      }
      
      if (exifData) {
        formData.append('exif', JSON.stringify(exifData));
      }
      
      if (gpsData) {
        formData.append('gps', JSON.stringify(gpsData));
      }

      // 6. Upload to edge function
      setProgress(50);
      
      const { data, error } = await authApi.invoke('upload-job-photo', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type with boundary
      });

      if (error) {
        throw new Error(error.message || 'Upload failed');
      }

      setProgress(100);

      return {
        url: data.url,
        path: data.path,
        mediaId: data.mediaId,
        isDuplicate: data.isDuplicate || false
      };
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

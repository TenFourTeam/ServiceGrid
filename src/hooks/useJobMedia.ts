import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MediaItem {
  id: string;
  file_type: 'photo' | 'video';
  mime_type: string;
  original_filename: string;
  file_size: number;
  public_url: string;
  thumbnail_url?: string;
  hls_manifest_url?: string;
  metadata?: {
    exif?: any;
    gps?: { latitude: number; longitude: number };
  };
  created_at: string;
  upload_status: 'uploading' | 'processing' | 'completed' | 'failed';
  
  // Optimistic update fields
  blobUrl?: string;
  isOptimistic?: boolean;
  uploadProgress?: number;
  uploadError?: string;
}

export function useJobMedia(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job-media', jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data, error } = await supabase
        .from('sg_media')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MediaItem[];
    },
    enabled: !!jobId
  });
}

export function createOptimisticMediaItem(file: File): MediaItem {
  const blobUrl = URL.createObjectURL(file);
  const isPhoto = file.type.startsWith('image/');
  
  return {
    id: `optimistic-${Date.now()}-${Math.random()}`,
    file_type: isPhoto ? 'photo' : 'video',
    mime_type: file.type,
    original_filename: file.name,
    file_size: file.size,
    public_url: blobUrl,
    thumbnail_url: isPhoto ? blobUrl : undefined,
    created_at: new Date().toISOString(),
    upload_status: 'uploading',
    blobUrl,
    isOptimistic: true,
    uploadProgress: 0
  };
}

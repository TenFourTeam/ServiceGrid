import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface MediaItem {
  id: string;
  file_type: 'photo' | 'video';
  mime_type: string;
  original_filename: string;
  file_size: number;
  public_url: string;
  thumbnail_url?: string;
  hls_manifest_url?: string;
  checklist_item_id?: string | null;
  metadata?: {
    exif?: any;
    gps?: { latitude: number; longitude: number };
  };
  generation_metadata?: {
    is_ai_generated: boolean;
    generation_type: string;
    source_media_id?: string;
    prompt?: string;
    model?: string;
    variation_number?: number;
    total_variations?: number;
    generation_id?: string;
    style?: string;
  };
  created_at: string;
  upload_status: 'uploading' | 'processing' | 'completed' | 'failed';
  
  // Tagging fields
  tags?: string[];
  
  // Annotation fields
  annotations?: Annotation[];
  has_annotations?: boolean;
  annotated_image_url?: string;
  
  // Optimistic update fields
  blobUrl?: string;
  isOptimistic?: boolean;
  uploadProgress?: number;
  uploadError?: string;
}

export interface Annotation {
  id: string;
  type: 'arrow' | 'rect' | 'ellipse' | 'line' | 'text' | 'path';
  x: number;
  y: number;
  width?: number;
  height?: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  text?: string;
  points?: number[];
  rotation?: number;
  created_by: string;
  created_at: string;
}

export function useJobMedia(jobId: string | undefined) {
  const authApi = useAuthApi();
  
  return useQuery({
    queryKey: ['job-media', jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data, error } = await authApi.invoke(
        `job-media-crud?jobId=${jobId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return (data?.media || []) as MediaItem[];
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

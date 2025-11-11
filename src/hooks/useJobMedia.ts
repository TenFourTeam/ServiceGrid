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
  upload_status: string;
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

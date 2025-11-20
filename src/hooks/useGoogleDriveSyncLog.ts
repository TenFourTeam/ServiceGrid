import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { supabase } from '@/integrations/supabase/client';
import type { GoogleDriveSyncLog } from '@/types/googleDrive';

export function useGoogleDriveSyncLog() {
  const { businessId } = useBusinessContext();

  return useQuery<GoogleDriveSyncLog[]>({
    queryKey: ['google-drive', 'sync-logs', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_drive_sync_log')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as GoogleDriveSyncLog[];
    },
  });
}

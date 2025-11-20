import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { supabase } from '@/integrations/supabase/client';
import type { QBSyncLog } from '@/types/quickbooks';

export function useQuickBooksSyncLogs() {
  const { businessId } = useBusinessContext();

  return useQuery<QBSyncLog[]>({
    queryKey: ['quickbooks', 'sync-logs', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quickbooks_sync_log')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as QBSyncLog[];
    },
  });
}

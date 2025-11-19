import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { queryKeys } from '@/queries/keys';
import { supabase } from '@/integrations/supabase/client';

interface CallLog {
  id: string;
  callSid: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  durationSeconds: number | null;
  recordingUrl: string | null;
  transcript: string | null;
  aiHandled: boolean;
  aiSummary: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    fullName: string;
  };
}

interface CallLogsFilters {
  customerId?: string;
  status?: string;
  direction?: 'inbound' | 'outbound';
  dateFrom?: string;
  dateTo?: string;
}

export function useCallLogs(filters?: CallLogsFilters) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  const queryKey = queryKeys.voip.callLogs(businessId, filters);

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters?.customerId) queryParams.set('customerId', filters.customerId);
      if (filters?.status) queryParams.set('status', filters.status);
      if (filters?.direction) queryParams.set('direction', filters.direction);
      if (filters?.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) queryParams.set('dateTo', filters.dateTo);

      const result = await authApi.invoke(`voip-call-logs?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch call logs');
      }

      return result.data?.callLogs as CallLog[] || [];
    },
    enabled: !!businessId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Real-time subscription
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel('call-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log('[useCallLogs] Real-time update:', payload);
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient, queryKey]);

  return {
    callLogs: data || [],
    isLoading,
    error,
  };
}

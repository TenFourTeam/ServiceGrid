import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { SyncSchedule } from '@/types/quickbooks';

export function useQuickBooksSyncSchedule() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery<SyncSchedule[]>({
    queryKey: ['quickbooks', 'sync-schedules', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('quickbooks-sync-schedules', {
        method: 'GET'
      });

      if (error) throw new Error(error.message);
      return data as SyncSchedule[];
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async (schedule: Partial<SyncSchedule> & { id: string }) => {
      const { data, error } = await authApi.invoke('quickbooks-sync-schedules', {
        method: 'PATCH',
        body: schedule
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'sync-schedules', businessId] });
      toast.success('Schedule updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: Omit<SyncSchedule, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await authApi.invoke('quickbooks-sync-schedules', {
        method: 'POST',
        body: schedule
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'sync-schedules', businessId] });
      toast.success('Schedule created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });

  return {
    schedules: schedules || [],
    isLoading,
    updateSchedule: updateSchedule.mutate,
    createSchedule: createSchedule.mutate,
    isUpdating: updateSchedule.isPending,
    isCreating: createSchedule.isPending,
  };
}

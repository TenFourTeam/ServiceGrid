import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';
import { queryKeys } from '@/queries/keys';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface TimesheetEntry {
  id: string;
  user_id: string;
  business_id: string;
  job_id: string | null;
  clock_in_time: string;
  clock_out_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTimesheet(targetBusinessId?: string) {
  const { businessId, role } = useBusinessContext(targetBusinessId);
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  // Get current user's timesheet entries via edge function
  const { data: entries = [], isLoading } = useQuery({
    queryKey: queryKeys.data.timesheet(businessId || ''),
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await authApi.invoke('timesheet-crud', {
        method: 'GET',
        headers: {
          'x-business-id': businessId
        }
      });

      if (error) {
        console.error('Error fetching timesheet entries:', error);
        throw new Error(error.message || 'Failed to fetch timesheet entries');
      }

      return data?.entries || [];
    },
    enabled: !!businessId,
  });

  // Get current active entry (clocked in but not out)
  const activeEntry = entries.find(entry => !entry.clock_out_time);
  const isClockedIn = !!activeEntry;

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async ({ notes, jobId }: { notes?: string; jobId?: string }) => {
      if (!businessId) throw new Error('No business selected');

      const { data, error } = await authApi.invoke('timesheet-crud', {
        method: 'POST',
        body: { notes, jobId },
        headers: {
          'x-business-id': businessId
        }
      });

      if (error) throw new Error(error.message || 'Failed to clock in');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.timesheet(businessId || '') });
      toast.success('Clocked in successfully');
    },
    onError: (error: any) => {
      console.error('Clock in error:', error);
      toast.error(error.message || 'Failed to clock in');
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async ({ entryId, notes }: { entryId: string; notes?: string }) => {
      const { data, error } = await authApi.invoke('timesheet-crud', {
        method: 'PUT',
        body: { entryId, notes, action: 'clock_out' },
        headers: {
          'x-business-id': businessId
        }
      });

      if (error) throw new Error(error.message || 'Failed to clock out');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.timesheet(businessId || '') });
      toast.success('Clocked out successfully');
    },
    onError: (error: any) => {
      console.error('Clock out error:', error);
      toast.error(error.message || 'Failed to clock out');
    },
  });

  // Edit entry mutation (owners only)
  const editEntryMutation = useMutation({
    mutationFn: async ({ 
      entryId, 
      clockInTime, 
      clockOutTime, 
      notes 
    }: { 
      entryId: string; 
      clockInTime?: string; 
      clockOutTime?: string; 
      notes?: string; 
    }) => {
      const { data, error } = await authApi.invoke('timesheet-crud', {
        method: 'PUT',
        body: { entryId, clockInTime, clockOutTime, notes, action: 'edit' },
        headers: {
          'x-business-id': businessId
        }
      });

      if (error) throw new Error(error.message || 'Failed to edit entry');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.timesheet(businessId || '') });
      toast.success('Entry updated successfully');
    },
    onError: (error: any) => {
      console.error('Edit entry error:', error);
      toast.error(error.message || 'Failed to edit entry');
    },
  });

  return {
    entries,
    isLoading,
    isClockedIn,
    activeEntry,
    role,
    clockIn: clockInMutation.mutate,
    clockOut: clockOutMutation.mutate,
    editEntry: editEntryMutation.mutate,
    isClockingIn: clockInMutation.isPending,
    isClockingOut: clockOutMutation.isPending,
    isEditingEntry: editEntryMutation.isPending,
  };
}
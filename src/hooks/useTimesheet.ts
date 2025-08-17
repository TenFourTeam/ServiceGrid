import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';
import { queryKeys } from '@/queries/keys';

export interface TimesheetEntry {
  id: string;
  user_id: string;
  business_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTimesheet() {
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  // Get current user's timesheet entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: queryKeys.data.timesheet(businessId || ''),
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('business_id', businessId)
        .order('clock_in_time', { ascending: false });

      if (error) {
        console.error('Error fetching timesheet entries:', error);
        throw error;
      }

      return data as TimesheetEntry[];
    },
    enabled: !!businessId,
  });

  // Get current active entry (clocked in but not out)
  const activeEntry = entries.find(entry => !entry.clock_out_time);
  const isClockedIn = !!activeEntry;

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async ({ notes }: { notes?: string }) => {
      if (!businessId) throw new Error('No business selected');

      const { data, error } = await supabase
        .from('timesheet_entries')
        .insert([{
          business_id: businessId,
          user_id: (await supabase.auth.getUser()).data.user?.id!,
          notes: notes || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.timesheet(businessId || '') });
      toast.success('Clocked in successfully');
    },
    onError: (error) => {
      console.error('Clock in error:', error);
      toast.error('Failed to clock in');
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async ({ entryId, notes }: { entryId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .update({
          clock_out_time: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.timesheet(businessId || '') });
      toast.success('Clocked out successfully');
    },
    onError: (error) => {
      console.error('Clock out error:', error);
      toast.error('Failed to clock out');
    },
  });

  return {
    entries,
    isLoading,
    isClockedIn,
    activeEntry,
    clockIn: clockInMutation.mutate,
    clockOut: clockOutMutation.mutate,
    isClockingIn: clockInMutation.isPending,
    isClockingOut: clockOutMutation.isPending,
  };
}
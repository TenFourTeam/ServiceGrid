import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { toast } from 'sonner';

interface RescheduleRequestData {
  jobId: string;
  preferredDate?: string;
  alternativeDates?: string[];
  preferredTimes?: string[];
  reason?: string;
  customerNotes?: string;
}

interface CancelRequestData {
  jobId: string;
  reason?: string;
  customerNotes?: string;
}

interface AppointmentChangeRequest {
  id: string;
  job_id: string;
  customer_id: string;
  business_id: string;
  request_type: 'reschedule' | 'cancel';
  preferred_date: string | null;
  alternative_dates: string[];
  preferred_times: string[];
  reason: string | null;
  customer_notes: string | null;
  status: 'pending' | 'approved' | 'denied';
  business_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  jobs?: {
    id: string;
    title: string | null;
    starts_at: string | null;
    ends_at: string | null;
    address: string | null;
    status: string;
  };
}

export function useCustomerAppointmentRequests() {
  const { sessionToken } = useCustomerAuth();
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['customer-appointment-requests'],
    queryFn: async () => {
      if (!sessionToken) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('customer-appointment-requests', {
        method: 'GET',
        headers: { 'x-session-token': sessionToken },
      });

      if (error) throw error;
      return data.requests as AppointmentChangeRequest[];
    },
    enabled: !!sessionToken,
  });

  const requestReschedule = useMutation({
    mutationFn: async (data: RescheduleRequestData) => {
      if (!sessionToken) throw new Error('Not authenticated');

      const { data: response, error } = await supabase.functions.invoke('customer-appointment-requests', {
        method: 'POST',
        headers: { 'x-session-token': sessionToken },
        body: { type: 'reschedule', ...data },
      });

      if (error) throw error;
      if (!response.success) throw new Error(response.error || 'Failed to submit request');
      return response.request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-appointment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['customer-job-data'] });
      toast.success('Reschedule request submitted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit reschedule request');
    },
  });

  const requestCancellation = useMutation({
    mutationFn: async (data: CancelRequestData) => {
      if (!sessionToken) throw new Error('Not authenticated');

      const { data: response, error } = await supabase.functions.invoke('customer-appointment-requests', {
        method: 'POST',
        headers: { 'x-session-token': sessionToken },
        body: { type: 'cancel', ...data },
      });

      if (error) throw error;
      if (!response.success) throw new Error(response.error || 'Failed to submit request');
      return response.request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-appointment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['customer-job-data'] });
      toast.success('Cancellation request submitted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit cancellation request');
    },
  });

  // Get pending request for a specific job
  const getPendingRequestForJob = (jobId: string) => {
    return requests?.find(r => r.job_id === jobId && r.status === 'pending');
  };

  return {
    requests,
    isLoading,
    error,
    requestReschedule,
    requestCancellation,
    getPendingRequestForJob,
    pendingRequests: requests?.filter(r => r.status === 'pending') || [],
  };
}

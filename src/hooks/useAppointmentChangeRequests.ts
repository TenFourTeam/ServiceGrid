import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';

export interface AppointmentChangeRequest {
  id: string;
  job_id: string;
  customer_id: string;
  business_id: string;
  request_type: 'reschedule' | 'cancel';
  status: 'pending' | 'approved' | 'denied';
  preferred_date: string | null;
  alternative_dates: string[] | null;
  preferred_times: string[] | null;
  reason: string | null;
  customer_notes: string | null;
  business_response: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  updated_at: string;
  jobs: {
    id: string;
    title: string | null;
    starts_at: string | null;
    ends_at: string | null;
    address: string | null;
    status: string;
  } | null;
  customers: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

export function useAppointmentChangeRequests(statusFilter?: 'pending' | 'approved' | 'denied') {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['appointment-change-requests', businessId, statusFilter],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (businessId) queryParams.businessId = businessId;
      if (statusFilter) queryParams.status = statusFilter;

      const { data, error } = await authApi.invoke('appointment-requests-manage', {
        method: 'GET',
        queryParams,
      });

      if (error) throw new Error(error.message || 'Failed to fetch requests');
      return (data?.requests || []) as AppointmentChangeRequest[];
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ 
      requestId, 
      action, 
      response 
    }: { 
      requestId: string; 
      action: 'approve' | 'deny'; 
      response?: string;
    }) => {
      const { data, error } = await authApi.invoke('appointment-requests-manage', {
        method: 'PATCH',
        queryParams: businessId ? { businessId } : {},
        body: { requestId, action, response },
      });

      if (error) throw new Error(error.message || 'Failed to respond to request');
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(`Request ${variables.action === 'approve' ? 'approved' : 'denied'}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const pendingCount = query.data?.filter(r => r.status === 'pending').length || 0;

  return {
    requests: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    pendingCount,
    respond: respondMutation.mutate,
    respondAsync: respondMutation.mutateAsync,
    isResponding: respondMutation.isPending,
  };
}

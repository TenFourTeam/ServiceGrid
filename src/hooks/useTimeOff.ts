import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';

export type TimeOffStatus = 'pending' | 'approved' | 'denied';

export interface TimeOffRequest {
  id: string;
  business_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: TimeOffStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name?: string;
    email: string;
  };
  reviewer?: {
    id: string;
    full_name?: string;
  };
}

export function useTimeOffRequests(userId?: string, status?: TimeOffStatus) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['time-off-requests', businessId, userId, status],
    queryFn: async () => {
      const params = new URLSearchParams({ businessId: businessId || '' });
      if (userId) params.append('userId', userId);
      if (status) params.append('status', status);

      const { data, error } = await authApi.invoke('time-off-crud', {
        method: 'GET',
        queryParams: Object.fromEntries(params),
      });

      if (error) throw error;
      return data as TimeOffRequest[];
    },
    enabled: !!businessId,
  });
}

export function useCreateTimeOffRequest() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (request: Omit<TimeOffRequest, 'id' | 'status' | 'created_at' | 'updated_at' | 'reviewed_by' | 'reviewed_at'>) => {
      const { data, error } = await authApi.invoke('time-off-crud', {
        method: 'POST',
        body: request,
        toast: {
          success: 'Time off request submitted successfully',
          loading: 'Submitting request...',
          error: 'Failed to submit time off request',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests', businessId] });
    },
  });
}

export function useUpdateTimeOffRequest() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async ({ id, status, ...updates }: Partial<TimeOffRequest> & { id: string }) => {
      const { data, error } = await authApi.invoke('time-off-crud', {
        method: 'PUT',
        body: { id, status, ...updates },
        toast: {
          success: status ? `Request ${status}` : 'Request updated successfully',
          loading: 'Updating request...',
          error: 'Failed to update request',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests', businessId] });
    },
  });
}

export function useDeleteTimeOffRequest() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await authApi.invoke('time-off-crud', {
        method: 'DELETE',
        body: { id },
        toast: {
          success: 'Time off request deleted successfully',
          loading: 'Deleting request...',
          error: 'Failed to delete request',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests', businessId] });
    },
  });
}

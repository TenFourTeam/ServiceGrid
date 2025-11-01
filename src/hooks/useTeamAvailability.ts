import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';

export interface TeamAvailability {
  id: string;
  business_id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export function useTeamAvailability(userId?: string) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['team-availability', businessId, userId],
    queryFn: async () => {
      const params = new URLSearchParams({ businessId: businessId || '' });
      if (userId) params.append('userId', userId);

      const { data, error } = await authApi.invoke('team-availability-crud', {
        method: 'GET',
        queryParams: Object.fromEntries(params),
      });

      if (error) throw error;
      return data as TeamAvailability[];
    },
    enabled: !!businessId,
  });
}

export function useCreateAvailability() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (availability: Omit<TeamAvailability, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await authApi.invoke('team-availability-crud', {
        method: 'POST',
        body: availability,
        toast: {
          success: 'Availability added successfully',
          loading: 'Adding availability...',
          error: 'Failed to add availability',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-availability', businessId] });
    },
  });
}

export function useUpdateAvailability() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeamAvailability> & { id: string }) => {
      const { data, error } = await authApi.invoke('team-availability-crud', {
        method: 'PUT',
        body: { id, ...updates },
        toast: {
          success: 'Availability updated successfully',
          loading: 'Updating availability...',
          error: 'Failed to update availability',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-availability', businessId] });
    },
  });
}

export function useDeleteAvailability() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await authApi.invoke('team-availability-crud', {
        method: 'DELETE',
        body: { id },
        toast: {
          success: 'Availability deleted successfully',
          loading: 'Deleting availability...',
          error: 'Failed to delete availability',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-availability', businessId] });
    },
  });
}

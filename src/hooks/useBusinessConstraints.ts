import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';

export type ConstraintType = 
  | 'max_jobs_per_day'
  | 'max_hours_per_day'
  | 'min_time_between_jobs'
  | 'max_travel_time'
  | 'business_hours'
  | 'buffer_time';

export interface BusinessConstraint {
  id: string;
  business_id: string;
  constraint_type: ConstraintType;
  constraint_value: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBusinessConstraints() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['business-constraints', businessId],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('business-constraints-crud', {
        method: 'GET',
        queryParams: { businessId: businessId || '' },
      });

      if (error) throw error;
      return data as BusinessConstraint[];
    },
    enabled: !!businessId,
  });
}

export function useUpsertConstraint() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (constraint: Omit<BusinessConstraint, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await authApi.invoke('business-constraints-crud', {
        method: 'POST',
        body: constraint,
        toast: {
          success: 'Constraint saved successfully',
          loading: 'Saving constraint...',
          error: 'Failed to save constraint',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-constraints', businessId] });
    },
  });
}

export function useUpdateConstraint() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BusinessConstraint> & { id: string }) => {
      const { data, error } = await authApi.invoke('business-constraints-crud', {
        method: 'PUT',
        body: { id, ...updates },
        toast: {
          success: 'Constraint updated successfully',
          loading: 'Updating constraint...',
          error: 'Failed to update constraint',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-constraints', businessId] });
    },
  });
}

export function useDeleteConstraint() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await authApi.invoke('business-constraints-crud', {
        method: 'DELETE',
        body: { id },
        toast: {
          success: 'Constraint deleted successfully',
          loading: 'Deleting constraint...',
          error: 'Failed to delete constraint',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-constraints', businessId] });
    },
  });
}

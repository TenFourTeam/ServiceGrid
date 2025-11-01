import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { queryKeys } from '@/queries/keys';

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface RecurringJobTemplate {
  id: string;
  business_id: string;
  customer_id: string;
  title: string;
  address?: string;
  notes?: string;
  estimated_duration_minutes: number;
  recurrence_pattern: RecurrencePattern;
  recurrence_config: any;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  auto_schedule: boolean;
  preferred_time_window?: any;
  assigned_members?: string[];
  last_generated_at?: string;
  next_generation_date?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    address?: string;
  };
}

export function useRecurringJobTemplates() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['recurring-job-templates', businessId],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('recurring-jobs-crud', {
        method: 'GET',
        queryParams: { businessId: businessId || '' },
      });

      if (error) throw error;
      return data.data as RecurringJobTemplate[];
    },
    enabled: !!businessId,
  });
}

export function useCreateRecurringTemplate() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (template: Omit<RecurringJobTemplate, 'id' | 'created_at' | 'updated_at' | 'last_generated_at' | 'next_generation_date'>) => {
      const { data, error } = await authApi.invoke('recurring-jobs-crud', {
        method: 'POST',
        body: template,
        toast: {
          success: 'Recurring job template created successfully',
          loading: 'Creating template...',
          error: 'Failed to create template',
        },
      });

      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-job-templates', businessId] });
    },
  });
}

export function useUpdateRecurringTemplate() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringJobTemplate> & { id: string }) => {
      const { data, error } = await authApi.invoke('recurring-jobs-crud', {
        method: 'PUT',
        body: { id, ...updates },
        toast: {
          success: 'Template updated successfully',
          loading: 'Updating template...',
          error: 'Failed to update template',
        },
      });

      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-job-templates', businessId] });
    },
  });
}

export function useDeleteRecurringTemplate() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await authApi.invoke('recurring-jobs-crud', {
        method: 'DELETE',
        body: { id },
        toast: {
          success: 'Template deleted successfully',
          loading: 'Deleting template...',
          error: 'Failed to delete template',
        },
      });

      if (error) throw error;
      return data.data || data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-job-templates', businessId] });
    },
  });
}

export function useGenerateRecurringJobs() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async ({ templateId, count = 4, startFromDate }: { templateId: string; count?: number; startFromDate?: string }) => {
      const { data, error } = await authApi.invoke('generate-recurring-jobs', {
        method: 'POST',
        body: { templateId, count, startFromDate },
        toast: {
          success: `Generated ${count} jobs successfully`,
          loading: 'Generating jobs...',
          error: 'Failed to generate jobs',
        },
      });

      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-job-templates', businessId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId || '') });
    },
  });
}

export function useCheckSchedulingCapacity() {
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async ({ businessId, startDate, endDate }: { businessId: string; startDate: string; endDate: string }) => {
      const { data, error } = await authApi.invoke('check-scheduling-capacity', {
        method: 'POST',
        body: { businessId, startDate, endDate },
      });

      if (error) throw error;
      return data.data;
    },
  });
}

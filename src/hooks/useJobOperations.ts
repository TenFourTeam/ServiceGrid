import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { useLifecycleEmailIntegration } from './useLifecycleEmailIntegration';
import { useAuthApi } from '@/hooks/useAuthApi';
import { queryKeys } from '@/queries/keys';

import type { Job } from '@/types';

export function useCreateJob() {
  const { businessId } = useBusinessContext();
  const { triggerJobScheduled } = useLifecycleEmailIntegration();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobData: Partial<Job>) => {
      const { data, error } = await authApi.invoke('jobs-crud', {
        method: 'POST',
        body: jobData,
        toast: {
          success: 'Job created successfully!',
          loading: 'Creating job...',
          error: 'Failed to create job'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create job');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId || '') });
      
      try {
        triggerJobScheduled();
      } catch (error) {
        console.error('[useCreateJob] Failed to trigger job milestone email:', error);
      }
    },
    onError: (error: any) => {
      console.error('[useCreateJob] error:', error);
    }
  });
}

export function useUpdateJob() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: Partial<Job> }) => {
      const { data, error } = await authApi.invoke('jobs-crud', {
        method: 'PUT',
        body: { id: jobId, ...updates },
        toast: {
          success: 'Job updated successfully!',
          loading: 'Updating job...',
          error: 'Failed to update job'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to update job');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId || '') });
    },
    onError: (error: any) => {
      console.error('[useUpdateJob] error:', error);
    }
  });
}
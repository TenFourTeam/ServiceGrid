/**
 * Standardized job mutations with proper invalidation
 */
import { useStandardMutation } from './useStandardMutation';
import { invalidationHelpers } from '@/queries/keys';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface JobData {
  customerId: string;
  quoteId?: string;
  title?: string;
  address?: string;
  startsAt?: string;
  endsAt?: string;
  status?: string;
  notes?: string;
  total?: number;
}

export function useJobMutations() {
  const { businessId } = useBusinessContext();

  const createJob = useStandardMutation<any, JobData>({
    mutationFn: async (data) => {
      return await edgeRequest(fn('jobs'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    },
    successMessage: 'Job created successfully',
    errorMessage: 'Failed to create job',
  });

  const updateJob = useStandardMutation<any, JobData & { id: string }>({
    mutationFn: async ({ id, ...data }) => {
      return await edgeRequest(fn(`jobs/${id}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    },
    successMessage: 'Job updated successfully',
    errorMessage: 'Failed to update job',
  });

  const deleteJob = useStandardMutation<any, { id: string }>({
    mutationFn: async ({ id }) => {
      return await edgeRequest(fn(`jobs/${id}`), {
        method: 'DELETE',
      });
    },
    onSuccess: (_, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
    },
    successMessage: 'Job deleted successfully',
    errorMessage: 'Failed to delete job',
  });

  return {
    createJob,
    updateJob,
    deleteJob,
  };
}
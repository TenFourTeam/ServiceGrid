/**
 * Standardized customer mutations with proper invalidation
 */
import { useStandardMutation } from './useStandardMutation';
import { invalidationHelpers } from '@/queries/keys';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface CustomerData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export function useCustomerMutations() {
  const { businessId } = useBusinessContext();

  const createCustomer = useStandardMutation<any, CustomerData>({
    mutationFn: async (data) => {
      return await edgeRequest(fn('customers'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.customers(queryClient, businessId);
      }
    },
    successMessage: 'Customer created successfully',
    errorMessage: 'Failed to create customer',
  });

  const updateCustomer = useStandardMutation<any, CustomerData & { id: string }>({
    mutationFn: async ({ id, ...data }) => {
      return await edgeRequest(fn(`customers/${id}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.customers(queryClient, businessId);
      }
    },
    successMessage: 'Customer updated successfully',
    errorMessage: 'Failed to update customer',
  });

  const deleteCustomer = useStandardMutation<any, { id: string }>({
    mutationFn: async ({ id }) => {
      return await edgeRequest(fn(`customers/${id}`), {
        method: 'DELETE',
      });
    },
    onSuccess: (_, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.customers(queryClient, businessId);
      }
    },
    successMessage: 'Customer deleted successfully',
    errorMessage: 'Failed to delete customer',
  });

  return {
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
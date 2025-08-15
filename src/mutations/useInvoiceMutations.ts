/**
 * Standardized invoice mutations with consistent error handling and invalidation
 */
import { useStandardMutation } from './useStandardMutation';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface InvoiceData {
  customerId: string;
  jobId?: string;
  status?: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  total?: number;
  subtotal?: number;
  taxRate?: number;
  discount?: number;
  dueAt?: string;
}

export function useInvoiceMutations() {
  const { businessId } = useBusinessContext();

  const createInvoice = useStandardMutation<any, InvoiceData>({
    mutationFn: async (data) => {
      return edgeRequest(fn('invoices'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.invoices(queryClient, businessId);
      }
    },
    successMessage: 'Invoice created successfully',
    errorMessage: 'Failed to create invoice',
  });

  const updateInvoice = useStandardMutation<any, { id: string; data: Partial<InvoiceData> }>({
    mutationFn: async ({ id, data }) => {
      return edgeRequest(fn(`invoices?id=${id}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.invoices(queryClient, businessId);
      }
    },
    successMessage: 'Invoice updated successfully',
    errorMessage: 'Failed to update invoice',
  });

  const deleteInvoice = useStandardMutation<any, string>({
    mutationFn: async (id) => {
      return edgeRequest(fn(`invoices?id=${id}`), {
        method: 'DELETE',
      });
    },
    onSuccess: (data, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.invoices(queryClient, businessId);
      }
    },
    successMessage: 'Invoice deleted successfully',
    errorMessage: 'Failed to delete invoice',
  });

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
}
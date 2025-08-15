/**
 * Standardized quote mutations with consistent error handling and invalidation
 */
import { useStandardMutation } from './useStandardMutation';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface QuoteData {
  customerId: string;
  address?: string;
  lineItems?: any[];
  status?: 'Draft' | 'Sent' | 'Approved' | 'Declined';
  notes?: string;
  notesInternal?: string;
  terms?: string;
  total?: number;
  subtotal?: number;
  taxRate?: number;
  discount?: number;
  paymentTerms?: string;
  frequency?: string;
  depositRequired?: boolean;
  depositPercent?: number;
}

export function useQuoteMutations() {
  const { businessId } = useBusinessContext();

  const createQuote = useStandardMutation<any, QuoteData>({
    mutationFn: async (data) => {
      return edgeRequest(fn('quotes'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.quotes(queryClient, businessId);
      }
    },
    successMessage: 'Quote created successfully',
    errorMessage: 'Failed to create quote',
  });

  const updateQuote = useStandardMutation<any, { id: string; data: Partial<QuoteData> }>({
    mutationFn: async ({ id, data }) => {
      return edgeRequest(fn(`quotes?id=${id}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.quotes(queryClient, businessId);
      }
    },
    successMessage: 'Quote updated successfully',
    errorMessage: 'Failed to update quote',
  });

  const deleteQuote = useStandardMutation<any, string>({
    mutationFn: async (id) => {
      return edgeRequest(fn(`quotes?id=${id}`), {
        method: 'DELETE',
      });
    },
    onSuccess: (data, variables, queryClient) => {
      if (businessId) {
        invalidationHelpers.quotes(queryClient, businessId);
      }
    },
    successMessage: 'Quote deleted successfully',
    errorMessage: 'Failed to delete quote',
  });

  return {
    createQuote,
    updateQuote,
    deleteQuote,
  };
}
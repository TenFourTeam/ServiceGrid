import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';
import { queryKeys } from '@/queries/keys';
import type { Quote } from '@/types';
import type { JobEstimate } from './useJobEstimation';

interface CreateQuoteFromPhotoParams {
  estimate: JobEstimate;
  customerId: string;
  jobId?: string;
  address?: string;
}

export function useQuoteFromPhoto() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ estimate, customerId, jobId, address }: CreateQuoteFromPhotoParams): Promise<Quote> => {
      const { data, error } = await authApi.invoke('quotes-crud', {
        method: 'POST',
        body: {
          customerId,
          jobId,
          address,
          lineItems: estimate.lineItems.map((item, index) => ({
            name: item.name,
            qty: item.quantity,
            unit: item.unit,
            unitPrice: item.unit_price,
            position: index,
            itemType: item.item_type,
            laborHours: item.labor_hours,
            crewSize: item.crew_size
          })),
          notesInternal: `AI-generated from photo. ${estimate.additionalNotes || ''}`,
          terms: estimate.workDescription,
          status: 'Draft'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create quote');
      }

      return data?.quote as Quote;
    },
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId || '') });
      toast.success('Quote created from photo!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create quote');
    }
  });
}

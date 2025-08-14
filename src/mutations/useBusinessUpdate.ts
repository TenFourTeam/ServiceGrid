/**
 * Business update mutation with proper React Query integration
 */
import { useStandardMutation } from './useStandardMutation';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys } from '@/queries/keys';

interface BusinessUpdatePayload {
  name?: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
}

export function useBusinessUpdate() {
  return useStandardMutation({
    mutationFn: async (payload: BusinessUpdatePayload) => {
      return await edgeRequest(fn('update-business'), {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    invalidateQueries: [
      [...queryKeys.business.current()],
      [...queryKeys.dashboard.summary()],
    ],
    successMessage: 'Business updated successfully',
    errorMessage: 'Failed to update business',
  });
}
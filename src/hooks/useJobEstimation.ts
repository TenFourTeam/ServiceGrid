import { useMutation } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export interface EstimatedLineItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  unit: string;
  notes?: string;
}

export interface JobEstimate {
  lineItems: EstimatedLineItem[];
  workDescription: string;
  additionalNotes?: string;
  confidence: 'high' | 'medium' | 'low';
  sourceMediaId: string;
}

export function useJobEstimation() {
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async ({ mediaId, jobId }: { mediaId: string; jobId?: string }): Promise<JobEstimate> => {
      const { data, error } = await authApi.invoke('estimate-job-from-photo', {
        method: 'POST',
        body: { mediaId, jobId },
      });

      if (error) {
        if (error.status === 429 || error.errorType === 'RATE_LIMIT') {
          const rateLimitError = new Error('AI is experiencing high demand. Please try again in a moment.');
          (rateLimitError as any).errorType = 'RATE_LIMIT';
          throw rateLimitError;
        }
        if (error.status === 402 || error.errorType === 'PAYMENT_REQUIRED') {
          const paymentError = new Error('AI credits exhausted. Please add credits to continue.');
          (paymentError as any).errorType = 'PAYMENT_REQUIRED';
          throw paymentError;
        }
        throw new Error(error.message || 'Failed to estimate job');
      }

      return data?.estimate as JobEstimate;
    },
  });
}

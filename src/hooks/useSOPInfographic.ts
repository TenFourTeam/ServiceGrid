import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';

interface GenerateInfographicParams {
  serviceId: string;
  serviceName: string;
  description?: string;
}

interface GenerateInfographicResponse {
  success: boolean;
  infographicUrl: string;
  serviceId: string;
  error?: string;
  errorType?: 'RATE_LIMIT' | 'PAYMENT_REQUIRED';
}

export function useSOPInfographic() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  const generateInfographic = useMutation({
    mutationFn: async ({ serviceId, serviceName, description }: GenerateInfographicParams) => {
      const { data, error } = await authApi.invoke('generate-sop-infographic', {
        method: 'POST',
        body: { serviceId, serviceName, description }
      });

      if (error) {
        // Handle specific error types
        if (error.status === 429 || error.errorType === 'RATE_LIMIT') {
          throw new Error('AI is experiencing high demand. Please try again in a moment.');
        }
        if (error.status === 402 || error.errorType === 'PAYMENT_REQUIRED') {
          throw new Error('AI credits exhausted. Please add credits to continue.');
        }
        throw new Error(error.message || 'Failed to generate infographic');
      }

      return data as GenerateInfographicResponse;
    },
    onSuccess: (data, variables) => {
      toast.success('Process infographic generated!');
      // Invalidate service catalog to refresh with new infographic_url
      queryClient.invalidateQueries({ queryKey: ['service-catalog', businessId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate infographic');
    }
  });

  return {
    generateInfographic: generateInfographic.mutate,
    generateInfographicAsync: generateInfographic.mutateAsync,
    isGenerating: generateInfographic.isPending,
    error: generateInfographic.error
  };
}

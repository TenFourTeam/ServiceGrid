import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { queryKeys, invalidationHelpers } from '@/queries/keys';
import { toast } from 'sonner';
import { GenerationParams, GenerationResult } from '@/types/visualizations';

/**
 * Hook for generating property before/after visualizations
 * Uses AI to transform "before" photos into "after" previews
 */
export function usePropertyVisualization() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const generateVisualization = useMutation({
    mutationFn: async (params: GenerationParams): Promise<GenerationResult> => {
      const { data, error } = await authApi.invoke('generate-property-visualization', {
        method: 'POST',
        body: params,
      });

      if (error) {
        // Handle rate limiting
        if (error.status === 429 || error.errorType === 'RATE_LIMIT') {
          const rateLimitError = new Error(
            'AI is experiencing high demand. Please try again in a moment.'
          );
          (rateLimitError as any).errorType = 'RATE_LIMIT';
          throw rateLimitError;
        }
        
        // Handle payment/credits exhausted
        if (error.status === 402 || error.errorType === 'PAYMENT_REQUIRED') {
          const paymentError = new Error(
            'AI credits exhausted. Please add credits to continue generating visualizations.'
          );
          (paymentError as any).errorType = 'PAYMENT_REQUIRED';
          throw paymentError;
        }
        
        throw new Error(error.message || 'Failed to generate visualization');
      }

      return data as GenerationResult;
    },
    onSuccess: (_, variables) => {
      // Invalidate visualization queries
      if (variables.jobId) {
        invalidationHelpers.visualizations(queryClient, variables.jobId);
      }
      
      // Invalidate source media queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.visualizations.byMedia(variables.beforeMediaId) 
      });
      
      toast.success('Visualization generated successfully');
    },
    onError: (error: any) => {
      if (error.errorType === 'RATE_LIMIT') {
        toast.error('AI is busy', {
          description: 'Please wait a moment and try again.',
        });
      } else if (error.errorType === 'PAYMENT_REQUIRED') {
        toast.error('Credits exhausted', {
          description: 'Add AI credits to continue generating visualizations.',
        });
      } else {
        toast.error('Generation failed', {
          description: error.message || 'Could not generate visualization. Please try again.',
        });
      }
    },
  });

  return {
    generateVisualization,
    isGenerating: generateVisualization.isPending,
    error: generateVisualization.error,
  };
}

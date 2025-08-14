/**
 * Standard mutation pattern with proper error handling and invalidation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface StandardMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  invalidateQueries?: readonly string[][];
  successMessage?: string;
  errorMessage?: string;
}

export function useStandardMutation<TData = any, TVariables = any>({
  mutationFn,
  onSuccess,
  invalidateQueries = [],
  successMessage,
  errorMessage,
}: StandardMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidate specified queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: queryKey as string[] });
      });

      // Custom success handler
      onSuccess?.(data, variables);

      // Success toast
      if (successMessage) {
        toast({
          title: 'Success',
          description: successMessage,
        });
      }
    },
    onError: (error: any) => {
      console.error('[Mutation Error]', error);
      
      const message = error?.message || errorMessage || 'An error occurred';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
    retry: (failureCount, error: any) => {
      // Don't retry auth errors
      if (error?.status === 401 || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 1; // Retry once for other errors
    },
  });
}
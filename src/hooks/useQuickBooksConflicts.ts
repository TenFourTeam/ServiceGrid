import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { ConflictResolution } from '@/types/quickbooks';

export function useQuickBooksConflicts() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const { data: conflicts, isLoading } = useQuery<ConflictResolution[]>({
    queryKey: ['quickbooks', 'conflicts', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('quickbooks-conflicts', {
        method: 'GET'
      });

      if (error) throw new Error(error.message);
      return data as ConflictResolution[];
    },
  });

  const resolveConflict = useMutation({
    mutationFn: async ({
      conflictId,
      resolution,
      resolvedData,
    }: {
      conflictId: string;
      resolution: 'sg' | 'qb' | 'merged';
      resolvedData?: Record<string, unknown>;
    }) => {
      const { data, error } = await authApi.invoke('quickbooks-conflicts', {
        method: 'POST',
        body: { conflictId, resolution, resolvedData }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'conflicts', businessId] });
      toast.success('Conflict resolved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve conflict: ${error.message}`);
    },
  });

  const unresolvedConflicts = conflicts?.filter(c => !c.resolved_at) || [];

  return {
    conflicts: conflicts || [],
    unresolvedConflicts,
    isLoading,
    resolveConflict: resolveConflict.mutate,
    isResolving: resolveConflict.isPending,
  };
}

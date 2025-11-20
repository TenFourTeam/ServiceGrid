import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { EntityMapping } from '@/types/quickbooks';

export function useQuickBooksEntityMappings() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const { data: mappings, isLoading } = useQuery<EntityMapping[]>({
    queryKey: ['quickbooks', 'entity-mappings', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('quickbooks-entity-mappings', {
        method: 'GET'
      });

      if (error) throw new Error(error.message);
      return data as EntityMapping[];
    },
  });

  const unlinkEntity = useMutation({
    mutationFn: async ({ sgEntityId, entityType }: { sgEntityId: string; entityType: string }) => {
      const { data, error } = await authApi.invoke('quickbooks-entity-mappings', {
        method: 'DELETE',
        body: { sgEntityId, entityType }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'entity-mappings', businessId] });
      toast.success('Entity unlinked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink entity: ${error.message}`);
    },
  });

  return {
    mappings: mappings || [],
    isLoading,
    unlinkEntity: unlinkEntity.mutate,
    isUnlinking: unlinkEntity.isPending,
  };
}

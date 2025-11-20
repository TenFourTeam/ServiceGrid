import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { FieldMapping } from '@/types/quickbooks';

export function useQuickBooksFieldMappings() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const { data: mappings, isLoading } = useQuery<FieldMapping[]>({
    queryKey: ['quickbooks', 'field-mappings', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('quickbooks-field-mappings', {
        method: 'GET'
      });

      if (error) throw new Error(error.message);
      return data as FieldMapping[];
    },
  });

  const createMapping = useMutation({
    mutationFn: async (mapping: Omit<FieldMapping, 'id' | 'business_id' | 'created_at'>) => {
      const { data, error } = await authApi.invoke('quickbooks-field-mappings', {
        method: 'POST',
        body: mapping
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'field-mappings', businessId] });
      toast.success('Field mapping created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create mapping: ${error.message}`);
    },
  });

  const updateMapping = useMutation({
    mutationFn: async ({ id, ...mapping }: Partial<FieldMapping> & { id: string }) => {
      const { data, error } = await authApi.invoke('quickbooks-field-mappings', {
        method: 'PATCH',
        body: { id, ...mapping }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'field-mappings', businessId] });
      toast.success('Field mapping updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update mapping: ${error.message}`);
    },
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await authApi.invoke('quickbooks-field-mappings', {
        method: 'DELETE',
        body: { id }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'field-mappings', businessId] });
      toast.success('Field mapping deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete mapping: ${error.message}`);
    },
  });

  return {
    mappings: mappings || [],
    isLoading,
    createMapping: createMapping.mutate,
    updateMapping: updateMapping.mutate,
    deleteMapping: deleteMapping.mutate,
    isCreating: createMapping.isPending,
    isUpdating: updateMapping.isPending,
    isDeleting: deleteMapping.isPending,
  };
}

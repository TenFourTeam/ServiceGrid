import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { toast } from 'sonner';

export interface InventoryItem {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  unit_type: string;
  current_quantity: number;
  min_quantity?: number;
  max_quantity?: number;
  unit_cost?: number;
  supplier?: string;
  location?: string;
  last_restocked_at?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface InventoryTransaction {
  id: string;
  business_id: string;
  inventory_item_id: string;
  transaction_type: 'usage' | 'restock' | 'adjustment' | 'return';
  quantity: number;
  job_id?: string;
  user_id: string;
  notes?: string;
  transaction_date: string;
  created_at: string;
}

export function useInventory(businessId?: string) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['inventory', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await authApi.invoke('inventory-crud', {
        method: 'GET',
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch inventory');
      }

      return (data || []) as InventoryItem[];
    },
    enabled: !!businessId,
  });
}

export function useInventoryOperations() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  const createItem = useMutation({
    mutationFn: async (item: Partial<InventoryItem>) => {
      const { data, error } = await authApi.invoke('inventory-crud', {
        method: 'POST',
        body: item,
      });

      if (error) {
        throw new Error(error.message || 'Failed to create item');
      }

      return data;
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] });
      const previousData = queryClient.getQueryData(['inventory', newItem.business_id]);
      
      const optimisticItem: InventoryItem = {
        id: `temp-${Date.now()}`,
        business_id: newItem.business_id!,
        name: newItem.name!,
        description: newItem.description,
        sku: newItem.sku,
        category: newItem.category,
        unit_type: newItem.unit_type!,
        current_quantity: newItem.current_quantity || 0,
        min_quantity: newItem.min_quantity,
        max_quantity: newItem.max_quantity,
        unit_cost: newItem.unit_cost,
        supplier: newItem.supplier,
        location: newItem.location,
        last_restocked_at: newItem.last_restocked_at,
        notes: newItem.notes,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner_id: newItem.owner_id!,
      };

      queryClient.setQueryData(
        ['inventory', newItem.business_id],
        (old: InventoryItem[] | undefined) => [...(old || []), optimisticItem]
      );

      return { previousData };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['inventory', variables.business_id],
        (old: InventoryItem[] | undefined) => 
          (old || []).map(item => item.id.startsWith('temp-') ? data : item)
      );
      toast.success('Item added successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['inventory', variables.business_id], context.previousData);
      }
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await authApi.invoke('inventory-crud', {
        method: 'PATCH',
        queryParams: { id },
        body: updates,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update item');
      }

      return data;
    },
    onMutate: async ({ id, business_id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] });
      const previousData = queryClient.getQueryData(['inventory', business_id]);

      queryClient.setQueryData(
        ['inventory', business_id],
        (old: InventoryItem[] | undefined) =>
          (old || []).map(item => 
            item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
          )
      );

      return { previousData, business_id };
    },
    onSuccess: () => {
      toast.success('Item updated successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousData && context?.business_id) {
        queryClient.setQueryData(['inventory', context.business_id], context.previousData);
      }
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async ({ id, business_id }: { id: string; business_id: string }) => {
      const { error } = await authApi.invoke('inventory-crud', {
        method: 'DELETE',
        queryParams: { id },
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete item');
      }
    },
    onMutate: async ({ id, business_id }) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] });
      const previousData = queryClient.getQueryData(['inventory', business_id]);

      queryClient.setQueryData(
        ['inventory', business_id],
        (old: InventoryItem[] | undefined) => (old || []).filter(item => item.id !== id)
      );

      return { previousData, business_id };
    },
    onSuccess: () => {
      toast.success('Item deleted successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousData && context?.business_id) {
        queryClient.setQueryData(['inventory', context.business_id], context.previousData);
      }
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  const logTransaction = useMutation({
    mutationFn: async (transaction: Omit<InventoryTransaction, 'id' | 'created_at'>) => {
      const { data, error } = await authApi.invoke('inventory-crud', {
        method: 'POST',
        queryParams: { action: 'transaction' },
        body: transaction,
      });

      if (error) {
        throw new Error(error.message || 'Failed to log transaction');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Transaction recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record transaction: ${error.message}`);
    },
  });

  return {
    createItem,
    updateItem,
    deleteItem,
    logTransaction,
  };
}

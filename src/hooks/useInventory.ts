import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  return useQuery({
    queryKey: ['inventory', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!businessId,
  });
}

export function useInventoryOperations() {
  const queryClient = useQueryClient();

  const createItem = useMutation({
    mutationFn: async (item: Partial<InventoryItem>) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([item as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  const logTransaction = useMutation({
    mutationFn: async (transaction: Omit<InventoryTransaction, 'id' | 'created_at'>) => {
      const { data: item } = await supabase
        .from('inventory_items')
        .select('current_quantity')
        .eq('id', transaction.inventory_item_id)
        .single();

      if (!item) throw new Error('Item not found');

      const newQuantity = Number(item.current_quantity) + Number(transaction.quantity);

      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert(transaction);

      if (transactionError) throw transactionError;

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ 
          current_quantity: newQuantity,
          last_restocked_at: transaction.transaction_type === 'restock' ? new Date().toISOString() : undefined
        })
        .eq('id', transaction.inventory_item_id);

      if (updateError) throw updateError;
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

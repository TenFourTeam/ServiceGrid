import { useState, useCallback, useEffect } from 'react';
import { useApiClient } from '@/auth';
import { useDebouncedValue } from './useDebouncedValue';
import { useStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';

export type BusinessUpdateData = {
  name: string;
  phone: string;
  replyToEmail: string;
  taxRateDefault: number;
};

export function useBusinessUpdate() {
  const apiClient = useApiClient();
  const store = useStore();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingData, setPendingData] = useState<Partial<BusinessUpdateData> | null>(null);

  // Debounce the actual save operation
  const debouncedPendingData = useDebouncedValue(pendingData, 1000);

  const updateBusiness = useCallback(async (data: Partial<BusinessUpdateData>) => {
    // Store pending changes locally immediately
    setPendingData(prev => ({ ...prev, ...data }));
    
    // Update local store immediately for responsive UI
    store.setBusiness({
      ...store.business,
      ...data
    });
  }, [store]);

  // Effect to handle debounced save
  useEffect(() => {
    if (!debouncedPendingData) return;

    const saveBusiness = async () => {
      setIsUpdating(true);
      try {
        const response = await apiClient.put('/update-business', debouncedPendingData);
        
        if (response.error) {
          throw new Error(response.error);
        }

        // Clear pending data on successful save
        setPendingData(null);
        
        // Update store with server response to ensure consistency
        if (response.data?.business) {
          store.setBusiness({
            ...store.business,
            ...response.data.business
          });
        }

        toast({
          title: "Settings saved",
          description: "Your business settings have been updated successfully.",
        });

      } catch (error) {
        console.error('Failed to update business:', error);
        toast({
          title: "Save failed",
          description: "Failed to save your changes. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUpdating(false);
      }
    };

    saveBusiness();
  }, [debouncedPendingData, apiClient, store, toast]);

  return {
    updateBusiness,
    isUpdating,
    hasPendingChanges: !!pendingData
  };
}
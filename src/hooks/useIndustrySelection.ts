import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';

interface PopulateSOPsResponse {
  success: boolean;
  servicesCreated: number;
  totalPractices: number;
  skipped: number;
  message: string;
}

/**
 * Hook for managing industry selection and SOP population
 * Business owners can select their industry and automatically populate
 * their service catalog with industry-specific best practices (SOPs)
 */
export function useIndustrySelection() {
  const authApi = useAuthApi();
  const { businessId, business } = useBusinessContext();
  const queryClient = useQueryClient();

  const currentIndustry = business?.industry || null;

  const populateSOPs = useMutation({
    mutationFn: async (industry: string) => {
      const { data, error } = await authApi.invoke('populate-industry-sops', {
        method: 'POST',
        body: { industry },
      });
      
      if (error) throw new Error(error.message);
      return data as PopulateSOPsResponse;
    },
    onSuccess: (data) => {
      if (data.servicesCreated > 0) {
        toast.success(`${data.servicesCreated} SOPs added to your Service Catalog`, {
          description: 'Review and add pricing in the Service Catalog section below',
        });
      } else {
        toast.info(data.message, {
          description: 'These best practices are already in your catalog',
        });
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['service-catalog', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business', businessId] });
    },
    onError: (error: Error) => {
      console.error('Failed to populate SOPs:', error);
      toast.error('Failed to populate SOPs', {
        description: error.message,
      });
    },
  });

  return {
    currentIndustry,
    populateSOPs,
    isPopulating: populateSOPs.isPending,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { queryKeys } from '@/queries/keys';
import { toast } from 'sonner';

interface PhoneNumber {
  id: string;
  phoneNumber: string;
  friendlyName: string | null;
  twilioSid: string;
  status: 'active' | 'inactive' | 'suspended';
  capabilities: {
    voice: boolean;
    sms: boolean;
  };
  createdAt: string;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export function usePhoneNumbers() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.voip.phoneNumbers(businessId),
    queryFn: async () => {
      const result = await authApi.invoke('voip-phone-numbers-list', {
        method: 'GET',
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch phone numbers');
      }

      return result.data?.phoneNumbers as PhoneNumber[] || [];
    },
    enabled: !!businessId,
  });

  return {
    phoneNumbers: data || [],
    isLoading,
    error,
  };
}

export function useSearchPhoneNumbers() {
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async (params: { country?: string; areaCode?: string; contains?: string }) => {
      const queryParams = new URLSearchParams();
      if (params.country) queryParams.set('country', params.country);
      if (params.areaCode) queryParams.set('areaCode', params.areaCode);
      if (params.contains) queryParams.set('contains', params.contains);

      const result = await authApi.invoke(`voip-purchase-number?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to search phone numbers');
      }

      return result.data?.availableNumbers as AvailableNumber[] || [];
    },
  });
}

export function usePurchasePhoneNumber() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      const result = await authApi.invoke('voip-purchase-number', {
        method: 'POST',
        body: { phoneNumber },
        toast: {
          loading: 'Purchasing phone number...',
          success: 'Phone number purchased successfully!',
          error: 'Failed to purchase phone number',
        },
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to purchase phone number');
      }

      return result.data?.phoneNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.voip.phoneNumbers(businessId) });
    },
  });
}

export function useDeletePhoneNumber() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phoneNumberId: string) => {
      const result = await authApi.invoke('voip-phone-numbers-delete', {
        method: 'DELETE',
        body: { phoneNumberId },
        toast: {
          loading: 'Deleting phone number...',
          success: 'Phone number deleted successfully',
          error: 'Failed to delete phone number',
        },
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to delete phone number');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.voip.phoneNumbers(businessId) });
    },
  });
}

import { supabase } from '@/integrations/supabase/client';
import { queryKeys, invalidationHelpers } from '@/queries/keys';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { parsePhoneNumber } from 'libphonenumber-js';

export type ProfileUpdatePayload = {
  fullName: string;
  businessName?: string; // For reference only, not stored in profiles
  phoneRaw: string;
};

export type ProfileUpdateResponse = {
  data: {
    fullName: string;
    phoneE164: string;
    updatedAt?: string;
  };
};

/**
 * Direct Supabase profile operations hook - no Edge Function needed
 */
export function useProfileOperations() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const updateProfile = useMutation({
    mutationFn: async (input: ProfileUpdatePayload) => {
      console.info('[useProfileOperations] mutation started', { 
        payload: input,
        hasName: !!input.fullName, 
        hasBusiness: !!input.businessName, 
        hasPhone: !!input.phoneRaw 
      });
      
      // Normalize phone to E.164 format
      let phoneE164: string | null = null;
      if (input.phoneRaw?.trim()) {
        try {
          const parsed = parsePhoneNumber(input.phoneRaw, 'US');
          phoneE164 = parsed?.format('E.164') || null;
        } catch (error) {
          console.warn('[useProfileOperations] phone parsing failed:', error);
          phoneE164 = input.phoneRaw; // Fallback to raw input
        }
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: input.fullName,
          phone_e164: phoneE164,
          updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', userId!)
        .select('full_name, phone_e164, updated_at')
        .single();
      
      if (error) {
        console.error('[useProfileOperations] error:', error);
        throw error;
      }
      
      console.info('[useProfileOperations] mutation completed successfully', data);
      return {
        data: {
          fullName: data.full_name,
          phoneE164: data.phone_e164,
          updatedAt: data.updated_at
        }
      };
    },
    onSuccess: () => {
      // Use centralized invalidation
      invalidationHelpers.profile(queryClient);
      
      // Force dashboard data refresh to update onboarding state
      window.dispatchEvent(new CustomEvent('business-updated'));
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || 'Failed to save your changes. Please check your connection and try again.');
    },
  });

  return {
    updateProfile,
    isUpdating: updateProfile.isPending
  };
}
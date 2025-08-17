import { useState, useEffect } from 'react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useProfile } from '@/queries/useProfile';
import { useProfileOperations } from '@/hooks/useProfileOperations';
import { useBusinessOperations } from '@/hooks/useBusinessOperations';
import { toast } from 'sonner';
import { formatPhoneInput, normalizePhoneToE164 } from '@/utils/validation';
import { formatNameSuggestion } from '@/validation/profile';
import { useUser } from '@clerk/clerk-react';

/**
 * Unified form state management for Settings page
 * Handles auto-sync with server data and optimistic updates
 */
export function useSettingsForm() {
  const { business, role } = useBusinessContext();
  const { data: profile } = useProfile();
  const { user } = useUser();
  
  
  const { updateProfile, isUpdating: isUpdatingProfile } = useProfileOperations();
  const { updateBusiness, isUpdating: isUpdatingBusiness } = useBusinessOperations();
  
  // Form state - computed from server data
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  
  // Auto-sync form state with server data
  useEffect(() => {
    if (profile?.fullName) {
      setUserName(profile.fullName);
    }
    if (profile?.phoneE164) {
      // Always display phone in user-friendly format
      setUserPhone(formatPhoneInput(profile.phoneE164));
    }
  }, [profile]);
  
  useEffect(() => {
    if (business?.name) {
      setBusinessName(business.name);
    }
  }, [business]);
  
  // Form validation - business name only required for owners
  const isFormValid = userName.trim() && userPhone.trim() && (role === 'worker' || businessName.trim());
  const isLoading = isUpdatingProfile || isUpdatingBusiness;
  
  // Phone formatting helper
  const handlePhoneChange = (value: string) => {
    setUserPhone(formatPhoneInput(value));
  };
  
  // Name suggestion
  const userNameSuggestion = formatNameSuggestion(userName);
  const shouldShowUserNameSuggestion = userName && userNameSuggestion !== userName;
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast.error("Missing information", {
        description: "Please fill in your name, phone number, and business name",
      });
      return;
    }

    try {
      // Optimistic update for immediate UI feedback
      const optimisticName = userName.trim();
      const optimisticBusinessName = businessName.trim();
      
      // Always update profile
      const profilePromise = updateProfile.mutateAsync({ 
        fullName: optimisticName, 
        phoneRaw: userPhone.trim(),
      });

      // Only update business if user is owner
      const promises = [profilePromise];
      if (role === 'owner') {
        const businessPromise = updateBusiness.mutateAsync({
          businessName: optimisticBusinessName,
          phone: normalizePhoneToE164(userPhone.trim()),
          replyToEmail: business?.replyToEmail,
        });
        promises.push(businessPromise);
      }

      await Promise.all(promises);
      
      // Optional non-blocking Clerk sync
      if (user && optimisticName) {
        try {
          const parts = optimisticName.split(' ');
          const firstName = parts.shift() || '';
          const lastName = parts.join(' ');
          await user.update({ firstName, lastName });
        } catch (clerkError) {
          console.warn('Clerk sync failed (non-blocking):', clerkError);
        }
      }
    } catch (error) {
      console.error('Profile/Business update failed:', error);
    }
  };
  
  return {
    // Form state
    userName,
    setUserName,
    userPhone,
    setUserPhone: handlePhoneChange,
    businessName,
    setBusinessName,
    
    // Form status
    isFormValid,
    isLoading,
    
    // Name suggestion
    userNameSuggestion,
    shouldShowUserNameSuggestion,
    applySuggestion: () => setUserName(userNameSuggestion),
    
    // Form submission
    handleSubmit,
  };
}
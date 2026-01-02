import { useState, useEffect } from 'react';
import { useProfile } from '@/queries/useProfile';
import { useProfileOperations } from '@/hooks/useProfileOperations';
import { toast } from 'sonner';
import { formatPhoneInput } from '@/utils/validation';
import { formatNameSuggestion } from '@/validation/profile';
import { useUser } from '@clerk/clerk-react';

/**
 * Profile form state management for Settings page
 * Handles personal profile data (name + phone) only
 */
export function useSettingsForm() {
  const { data: profile } = useProfile();
  const { user } = useUser();
  
  const { updateProfile, isUpdating } = useProfileOperations();
  
  // Form state - computed from server data
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  
  // Auto-sync form state with server data
  useEffect(() => {
    if (profile?.profile?.fullName) {
      setUserName(profile.profile.fullName);
    }
    if (profile?.profile?.phoneE164) {
      // Always display phone in user-friendly format
      setUserPhone(formatPhoneInput(profile.profile.phoneE164));
    }
  }, [profile]);
  
  // Form validation - only name and phone required
  const isFormValid = userName.trim() && userPhone.trim();
  const isLoading = isUpdating;
  
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
        description: "Please fill in your name and phone number",
      });
      return;
    }

    try {
      // Update profile only
      const optimisticName = userName.trim();
      
      await updateProfile.mutateAsync({ 
        fullName: optimisticName, 
        phoneRaw: userPhone.trim(),
      });
      
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
      console.error('Profile update failed:', error);
    }
  };
  
  return {
    // Form state
    userName,
    setUserName,
    userPhone,
    setUserPhone: handlePhoneChange,
    
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
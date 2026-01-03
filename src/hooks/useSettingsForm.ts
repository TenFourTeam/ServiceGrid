import { useState, useEffect } from 'react';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { useProfileOperations } from '@/hooks/useProfileOperations';
import { toast } from 'sonner';
import { formatPhoneInput } from '@/utils/validation';
import { formatNameSuggestion } from '@/validation/profile';

/**
 * Profile form state management for Settings page
 * Handles personal profile data (name + phone) only
 */
export function useSettingsForm() {
  const { profile } = useBusinessAuth();
  const { updateProfile, isUpdating } = useProfileOperations();
  
  // Form state - computed from server data
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  
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
      await updateProfile.mutateAsync({ 
        fullName: userName.trim(), 
        phoneRaw: userPhone.trim(),
      });
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
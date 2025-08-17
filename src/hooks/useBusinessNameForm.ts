import { useState, useEffect } from 'react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useBusinessOperations } from '@/hooks/useBusinessOperations';
import { toast } from 'sonner';

/**
 * Business name form state management for Settings page
 * Handles business name updates separately from profile and branding
 */
export function useBusinessNameForm() {
  const { business, role } = useBusinessContext();
  const { updateBusiness, isUpdating } = useBusinessOperations();
  
  // Form state for business name
  const [businessName, setBusinessName] = useState('');
  
  // Auto-sync form state with server data
  useEffect(() => {
    if (business?.name) {
      setBusinessName(business.name);
    }
  }, [business]);
  
  // Form validation - only business name required
  const isFormValid = businessName.trim() && role === 'owner';
  const isLoading = isUpdating;
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast.error("Missing information", {
        description: "Please fill in the business name",
      });
      return;
    }

    try {
      await updateBusiness.mutateAsync({
        businessName: businessName.trim(),
        phone: business?.phone,
        replyToEmail: business?.replyToEmail,
      });
    } catch (error) {
      console.error('Business name update failed:', error);
    }
  };
  
  return {
    // Form state
    businessName,
    setBusinessName,
    
    // Form status
    isFormValid,
    isLoading,
    
    // Form submission
    handleSubmit,
  };
}
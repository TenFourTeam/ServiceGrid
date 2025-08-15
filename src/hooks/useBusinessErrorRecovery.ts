import { useCallback, useEffect } from 'react';
import { useBusinessContext } from './useBusinessContext';
import { toast } from '@/hooks/use-toast';

/**
 * Business error recovery hook
 * Handles automatic recovery actions and user notifications
 */
export function useBusinessErrorRecovery() {
  const { hasBusinessError, businessError, refetchBusiness, isLoadingBusiness } = useBusinessContext();

  // Show error toast when business query fails
  useEffect(() => {
    if (hasBusinessError && businessError) {
      const isAuthError = businessError.message?.includes('401') || 
                         businessError.message?.includes('403') ||
                         businessError.message?.includes('unauthorized');
      
      if (isAuthError) {
        toast({
          title: "Authentication Required",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Business Data Error", 
          description: "Failed to load business information. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [hasBusinessError, businessError, refetchBusiness]);

  const handleRecovery = useCallback(() => {
    if (hasBusinessError) {
      refetchBusiness();
    }
  }, [hasBusinessError, refetchBusiness]);

  return {
    hasError: hasBusinessError,
    isRecovering: isLoadingBusiness && hasBusinessError,
    recover: handleRecovery,
  };
}
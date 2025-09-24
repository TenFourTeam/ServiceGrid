import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useProfile } from '@/queries/useProfile';

interface CurrentBusinessContextType {
  currentBusinessId: string | null;
  setCurrentBusinessId: (businessId: string | null) => void;
  isInitializing: boolean;
}

const CurrentBusinessContext = createContext<CurrentBusinessContextType | undefined>(undefined);

interface CurrentBusinessProviderProps {
  children: ReactNode;
}

export function CurrentBusinessProvider({ children }: CurrentBusinessProviderProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Simple profile query to get default business
  const { data: profileData, isLoading: isLoadingProfile } = useProfile();

  const setCurrentBusinessId = useCallback((businessId: string | null) => {
    console.log('[CurrentBusinessContext] Setting current business ID:', businessId);
    setCurrentBusinessIdState(businessId);
  }, []);

  // Simple initialization - just use the user's default business
  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load
    
    if (!isSignedIn) {
      setCurrentBusinessIdState(null);
      setIsInitializing(false);
      return;
    }

    if (isLoadingProfile) return; // Wait for profile to load

    // Use the business from profile data
    if (profileData?.business?.id && !currentBusinessId) {
      console.log('[CurrentBusinessContext] Auto-initializing with business:', profileData.business.id);
      setCurrentBusinessIdState(profileData.business.id);
    }
    
    setIsInitializing(false);
  }, [isLoaded, isSignedIn, isLoadingProfile, profileData?.business?.id, currentBusinessId]);

  return (
    <CurrentBusinessContext.Provider value={{
      currentBusinessId,
      setCurrentBusinessId,
      isInitializing
    }}>
      {children}
    </CurrentBusinessContext.Provider>
  );
}

export function useCurrentBusiness() {
  const context = useContext(CurrentBusinessContext);
  if (context === undefined) {
    throw new Error('useCurrentBusiness must be used within a CurrentBusinessProvider');
  }
  return context;
}
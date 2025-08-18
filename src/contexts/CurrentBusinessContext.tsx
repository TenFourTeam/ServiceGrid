import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CurrentBusinessContextType {
  currentBusinessId: string | null;
  setCurrentBusinessId: (businessId: string | null) => void;
}

const CurrentBusinessContext = createContext<CurrentBusinessContextType | undefined>(undefined);

interface CurrentBusinessProviderProps {
  children: ReactNode;
}

export function CurrentBusinessProvider({ children }: CurrentBusinessProviderProps) {
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(null);

  const setCurrentBusinessId = useCallback((businessId: string | null) => {
    console.log('[CurrentBusinessContext] Setting current business ID:', businessId);
    setCurrentBusinessIdState(businessId);
  }, []);

  return (
    <CurrentBusinessContext.Provider value={{
      currentBusinessId,
      setCurrentBusinessId
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
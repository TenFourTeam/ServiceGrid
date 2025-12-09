import React from 'react';
import { CustomerAuthContext, useCustomerAuthProvider } from '@/hooks/useCustomerAuth';

interface CustomerAuthProviderProps {
  children: React.ReactNode;
}

export function CustomerAuthProvider({ children }: CustomerAuthProviderProps) {
  const auth = useCustomerAuthProvider();

  return (
    <CustomerAuthContext.Provider value={auth}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

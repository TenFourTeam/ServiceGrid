import React, { createContext, useContext } from "react";

const HasClerkContext = createContext<boolean>(false);

export function ClerkRuntimeProvider({ hasClerk, children }: { hasClerk: boolean; children: React.ReactNode }) {
  return <HasClerkContext.Provider value={hasClerk}>{children}</HasClerkContext.Provider>;
}

export function useHasClerk() {
  return useContext(HasClerkContext);
}

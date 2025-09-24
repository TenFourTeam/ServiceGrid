import { useAuth } from "@clerk/clerk-react";
import { QueryClientClerkIntegration } from "./QueryClientClerkIntegration";
import { useCurrentBusiness } from "@/contexts/CurrentBusinessContext";

/**
 * Wrapper for QueryClientClerkIntegration that only renders when business context is ready
 */
export function QueryClientClerkIntegrationWrapper() {
  const { isLoaded } = useAuth();
  const { isInitializing } = useCurrentBusiness();

  // Only render the integration when Clerk is loaded and business context is initialized
  if (!isLoaded || isInitializing) {
    return null;
  }

  return <QueryClientClerkIntegration />;
}
// Re-export all auth components and hooks for easy importing
export { AuthBoundary, RequireAuth, PublicOnly } from './AuthBoundary';
export { default as AuthErrorBoundary } from './AuthErrorBoundary';
export { QueryClientClerkIntegration } from './QueryClientClerkIntegration';

// Re-export Clerk's useAuth as the primary auth hook
export { useAuth } from '@clerk/clerk-react';

// Export simplified business context hook  
export { useBusinessContext } from '@/hooks/useBusinessContext';
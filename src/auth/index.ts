// Re-export all auth components and hooks for easy importing
export { AuthBoundary, RequireAuth, PublicOnly } from './AuthBoundary';
export { default as AuthErrorBoundary } from './AuthErrorBoundary';
export { QueryClientClerkIntegration } from './QueryClientClerkIntegration';
export * from './types';

// Re-export Clerk's useAuth as the primary auth hook
export { useAuth } from '@clerk/clerk-react';

// Export new business auth hook  
export { useBusinessAuth } from '@/hooks/useBusinessAuth';
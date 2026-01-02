// Re-export all auth components and hooks for easy importing
export { AuthBoundary, RequireAuth, PublicOnly } from './AuthBoundary';
export { default as AuthErrorBoundary } from './AuthErrorBoundary';
export { QueryClientAuthIntegration } from './QueryClientAuthIntegration';

// Re-export the new auth hooks as the primary auth interface
export { useAuth, useUser, useBusinessAuth } from '@/hooks/useBusinessAuth';

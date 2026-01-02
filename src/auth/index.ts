// Re-export all auth components and hooks for easy importing
export { AuthBoundary, RequireAuth, PublicOnly } from './AuthBoundary';
export { default as AuthErrorBoundary } from './AuthErrorBoundary';
export { QueryClientIntegration } from './QueryClientIntegration';

// Re-export useAuth from our unified hook
export { useAuth, useUser } from '@/hooks/useAuth';

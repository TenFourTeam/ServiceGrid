import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth, useBusinessAuthContext } from "@/hooks/useBusinessAuth";
import LoadingScreen from "@/components/LoadingScreen";

interface AuthBoundaryProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  publicOnly?: boolean;
  redirectTo?: string;
}

// Check if there's evidence of a Supabase session in localStorage
function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  return Object.keys(localStorage).some(key => 
    key.includes('supabase') && key.includes('auth')
  );
}

export function AuthBoundary({ 
  children, 
  requireAuth = false, 
  publicOnly = false,
  redirectTo 
}: AuthBoundaryProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useBusinessAuthContext();
  const location = useLocation();

  // Show loading screen while auth is initializing
  if (!isLoaded) {
    return <LoadingScreen full label="Checking session" />;
  }

  // Handle public-only routes (redirect authenticated users)
  if (publicOnly && isSignedIn) {
    return <Navigate to={redirectTo || "/calendar"} replace />;
  }

  // Handle protected routes (redirect unauthenticated users)
  if (requireAuth && !isSignedIn) {
    // If there's evidence of a session (in memory or localStorage),
    // show loading instead of redirecting - session might still be initializing
    if (session || hasStoredSession()) {
      return <LoadingScreen full label="Verifying session" />;
    }
    return <Navigate 
      to="/" 
      replace 
      state={{ from: location }}
    />;
  }

  return <>{children}</>;
}

// Convenience components for common patterns
export function RequireAuth() {
  return (
    <AuthBoundary requireAuth>
      <Outlet />
    </AuthBoundary>
  );
}

export function PublicOnly({ redirectTo }: { redirectTo?: string } = {}) {
  return (
    <AuthBoundary publicOnly redirectTo={redirectTo}>
      <Outlet />
    </AuthBoundary>
  );
}

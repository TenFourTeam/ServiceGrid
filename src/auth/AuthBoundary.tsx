import React, { useEffect } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth, useBusinessAuthContext } from "@/hooks/useBusinessAuth";
import BootLoadingScreen from "@/components/BootLoadingScreen";
import { setBootStage } from "@/lib/boot-trace";

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

  // Report auth checking stage
  useEffect(() => {
    if (!isLoaded) {
      setBootStage('auth_checking');
    }
  }, [isLoaded]);

  // Show loading screen while auth is initializing
  if (!isLoaded) {
    return <BootLoadingScreen full fallbackLabel="Checking session" />;
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
      return <BootLoadingScreen full fallbackLabel="Verifying session" />;
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

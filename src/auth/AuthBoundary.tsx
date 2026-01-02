import React, { useEffect, useRef } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth, useBusinessAuthContext } from "@/hooks/useBusinessAuth";
import LoadingScreen from "@/components/LoadingScreen";
import { toast } from "sonner";

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
  const { isLoaded, isSignedIn, authTimedOut } = useAuth();
  const { session } = useBusinessAuthContext();
  const location = useLocation();
  const hasShownTimeoutToast = useRef(false);

  // Show toast when auth times out (only once)
  useEffect(() => {
    if (authTimedOut && !hasShownTimeoutToast.current) {
      hasShownTimeoutToast.current = true;
      toast.error("Session expired", {
        description: "Your session could not be verified. Please sign in again.",
      });
    }
  }, [authTimedOut]);

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
    // If auth timed out, we've already cleared tokens - redirect immediately
    if (authTimedOut) {
      return <Navigate to="/" replace state={{ from: location }} />;
    }
    
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

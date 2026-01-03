import React, { useEffect, useRef } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth, useBusinessAuthContext } from "@/hooks/useBusinessAuth";
import LoadingScreen from "@/components/LoadingScreen";
import { toast } from "sonner";

// Logging helper with timestamps
function authLog(category: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(`[${timestamp}] [AuthBoundary:${category}] ${message}`, data ? data : '');
}

interface AuthBoundaryProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  publicOnly?: boolean;
  redirectTo?: string;
}

// Check if there's evidence of a Supabase session in localStorage
function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTokens = Object.keys(localStorage).some(key => 
    key.includes('supabase') && key.includes('auth')
  );
  authLog('CHECK', 'Checking for stored session', { hasTokens });
  return hasTokens;
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

  authLog('RENDER', 'AuthBoundary rendering', { 
    requireAuth, 
    publicOnly, 
    isLoaded, 
    isSignedIn, 
    authTimedOut,
    hasSession: !!session,
    path: location.pathname
  });

  // Show toast when auth times out (only once)
  useEffect(() => {
    if (authTimedOut && !hasShownTimeoutToast.current) {
      hasShownTimeoutToast.current = true;
      authLog('TIMEOUT', 'Auth timed out - showing toast');
      toast.error("Session expired", {
        description: "Your session could not be verified. Please sign in again.",
      });
    }
  }, [authTimedOut]);

  // Show loading screen while auth is initializing
  if (!isLoaded) {
    authLog('DECISION', 'Auth not loaded - showing loading screen');
    return <LoadingScreen full label="Checking session" />;
  }

  // Handle public-only routes (redirect authenticated users)
  if (publicOnly && isSignedIn) {
    const target = redirectTo || "/calendar";
    authLog('DECISION', 'Public-only route but user is signed in - redirecting', { target });
    return <Navigate to={target} replace />;
  }

  // Handle protected routes (redirect unauthenticated users)
  if (requireAuth && !isSignedIn) {
    // If auth timed out, we've already cleared tokens - redirect immediately
    if (authTimedOut) {
      authLog('DECISION', 'Auth timed out - redirecting to landing');
      return <Navigate to="/" replace state={{ from: location }} />;
    }
    
    // If there's evidence of a session (in memory or localStorage),
    // show loading instead of redirecting - session might still be initializing
    if (session || hasStoredSession()) {
      authLog('DECISION', 'Session detected but not signed in - showing loading');
      return <LoadingScreen full label="Verifying session" />;
    }
    
    authLog('DECISION', 'Not authenticated - redirecting to landing');
    return <Navigate 
      to="/" 
      replace 
      state={{ from: location }}
    />;
  }

  authLog('DECISION', 'Rendering children');
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

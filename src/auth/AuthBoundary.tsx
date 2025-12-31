import React, { useEffect } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import BootLoadingScreen from "@/components/BootLoadingScreen";
import { setBootStage } from "@/lib/boot-trace";

interface AuthBoundaryProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  publicOnly?: boolean;
  redirectTo?: string;
}

export function AuthBoundary({ 
  children, 
  requireAuth = false, 
  publicOnly = false,
  redirectTo 
}: AuthBoundaryProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  // Report auth checking stage
  useEffect(() => {
    if (!isLoaded) {
      setBootStage('auth_checking');
    }
  }, [isLoaded]);

  // Show loading screen while Clerk is initializing
  if (!isLoaded) {
    return <BootLoadingScreen full fallbackLabel="Checking session" />;
  }

  // Handle public-only routes (redirect authenticated users)
  if (publicOnly && isSignedIn) {
    return <Navigate to={redirectTo || "/calendar"} replace />;
  }

  // Handle protected routes (redirect unauthenticated users)
  if (requireAuth && !isSignedIn) {
    return <Navigate 
      to="/clerk-auth" 
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
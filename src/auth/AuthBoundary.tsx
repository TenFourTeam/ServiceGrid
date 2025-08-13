import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuthSnapshot } from "./AuthKernel";
import LoadingScreen from "@/components/LoadingScreen";
import LockScreen from "./LockScreen";

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
  const { snapshot } = useAuthSnapshot();
  const location = useLocation();

  // Show loading screen while auth is initializing
  if (snapshot.phase === 'loading') {
    return <LoadingScreen full />;
  }

  // Show lock screen when locked
  if (snapshot.phase === 'locked') {
    return <LockScreen />;
  }

  // Handle public-only routes (redirect authenticated users)
  if (publicOnly && snapshot.phase === 'authenticated') {
    return <Navigate to={redirectTo || "/calendar"} replace />;
  }

  // Handle protected routes (redirect unauthenticated users)
  if (requireAuth && snapshot.phase !== 'authenticated') {
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

export function PublicOnly({ redirectTo }: { redirectTo?: string }) {
  return (
    <AuthBoundary publicOnly redirectTo={redirectTo}>
      <Outlet />
    </AuthBoundary>
  );
}
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useBusinessContext } from "@/hooks/useBusinessContext";

interface RequireRoleProps {
  role: 'owner' | 'worker';
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Centralized role-based access control component
 * Wraps content that requires specific user roles
 */
export function RequireRole({ 
  role, 
  children, 
  fallback, 
  redirectTo = "/calendar" 
}: RequireRoleProps) {
  const { role: userRole, isLoadingBusiness } = useBusinessContext();

  // Show loading state while business context resolves
  if (isLoadingBusiness) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Check if user has required role
  const hasRequiredRole = role === 'worker' ? 
    (userRole === 'owner' || userRole === 'worker') : // Workers can access worker content, owners can access everything
    userRole === role; // Exact role match for owner-only content

  if (!hasRequiredRole) {
    // Use custom fallback if provided, otherwise redirect
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
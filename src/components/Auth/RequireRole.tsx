import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useBusinessContext } from "@/hooks/useBusinessContext";

interface RequireRoleProps {
  role: 'owner' | 'worker' | ('owner' | 'worker')[];
  children: ReactNode;
  fallback?: ReactNode | null;
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
  // Owners can access all content (both owner and worker)
  // Workers can only access worker content
    const hasRequiredRole = Array.isArray(role) 
      ? role.some(r => r === userRole || (r === 'worker' && userRole === 'owner'))
      : role === 'worker' 
        ? (userRole === 'owner' || userRole === 'worker') 
        : userRole === role;

  if (!hasRequiredRole) {
    // Use custom fallback if provided, otherwise redirect
    if (fallback !== undefined) {
      return fallback === null ? null : <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
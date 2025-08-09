
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "./AuthProvider";
import { useHasClerk } from "./ClerkRuntime";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

function ClerkGate({ hasSupabaseUser, children, redirectTo }: { hasSupabaseUser: boolean; children: ReactNode; redirectTo: string }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (hasSupabaseUser || isSignedIn) return <>{children}</>;
  return <Navigate to={redirectTo} replace />;
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const hasClerk = useHasClerk();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (hasClerk) {
    return (
      <ClerkGate hasSupabaseUser={!!user} redirectTo="/clerk-auth">
        {children}
      </ClerkGate>
    );
  }

  if (user) return <>{children}</>;
  return <Navigate to="/auth" replace state={{ from: location }} />;
}

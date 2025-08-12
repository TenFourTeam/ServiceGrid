import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useHasClerk } from "@/components/Auth/ClerkRuntime";

function ProtectedRouteInner({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <>{children}</>;

  return <Navigate to="/clerk-auth" replace state={{ from: location }} />;
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const hasClerk = useHasClerk();
  if (!hasClerk) return <LoadingScreen />;
  return <ProtectedRouteInner>{children}</ProtectedRouteInner>;
}

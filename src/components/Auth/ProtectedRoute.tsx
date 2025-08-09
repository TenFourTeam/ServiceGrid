
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "./AuthProvider";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isSignedIn, isLoaded } = useClerkAuth();
  const location = useLocation();

  if (loading || !isLoaded) return <LoadingScreen />;
  if (!user && !isSignedIn) return <Navigate to="/clerk-auth" replace state={{ from: location }} />;
  return <>{children}</>;
}

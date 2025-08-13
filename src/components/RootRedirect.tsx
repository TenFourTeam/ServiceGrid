import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useHasClerk } from "@/components/Auth/ClerkRuntime";
import LoadingScreen from "@/components/LoadingScreen";
import LandingPage from "@/pages/Landing";

export default function RootRedirect() {
  const hasClerk = useHasClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasClerk || !isLoaded) return;

    if (isSignedIn) {
      // Immediately redirect authenticated users to calendar
      navigate('/calendar', { replace: true });
    }
  }, [hasClerk, isLoaded, isSignedIn, navigate]);

  // Show loading while Clerk is loading or redirecting authenticated users
  if (!hasClerk || !isLoaded || isSignedIn) {
    return <LoadingScreen full />;
  }

  // Show landing page only for confirmed unauthenticated users
  return <LandingPage />;
}

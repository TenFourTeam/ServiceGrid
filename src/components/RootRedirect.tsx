import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useHasClerk } from "@/components/Auth/ClerkRuntime";
import LoadingScreen from "@/components/LoadingScreen";

export default function RootRedirect() {
  const hasClerk = useHasClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasClerk || !isLoaded) return;

    if (isSignedIn) {
      // Check if user just logged out - if so, redirect to landing
      const justLoggedOut = sessionStorage.getItem('just-logged-out');
      if (justLoggedOut) {
        sessionStorage.removeItem('just-logged-out');
        navigate('/landing', { replace: true });
        return;
      }
      
      // Otherwise redirect authenticated users to calendar
      navigate('/calendar', { replace: true });
    } else {
      // Redirect unauthenticated users to landing
      navigate('/landing', { replace: true });
    }
  }, [hasClerk, isLoaded, isSignedIn, navigate]);

  // Show loading while determining where to redirect
  return <LoadingScreen full />;
}

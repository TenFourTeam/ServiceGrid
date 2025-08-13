import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useHasClerk } from "@/components/Auth/ClerkRuntime";
import LoadingScreen from "@/components/LoadingScreen";
import LandingPage from "@/pages/Landing";

export default function RootRedirect() {
  const hasClerk = useHasClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!hasClerk) return;

    // Wait for both Clerk to be loaded AND a small delay for session restoration
    if (isLoaded && !hasInitialized) {
      // Add a brief delay to ensure session is fully restored after hard refresh
      const timer = setTimeout(() => {
        setHasInitialized(true);
        
        if (isSignedIn) {
          // Check if user just logged out - if so, stay on landing
          const justLoggedOut = sessionStorage.getItem('just-logged-out');
          if (justLoggedOut) {
            sessionStorage.removeItem('just-logged-out');
            return;
          }
          
          // Otherwise redirect authenticated users to calendar
          navigate('/calendar', { replace: true });
        }
        // Unauthenticated users stay on landing page (no redirect needed)
      }, 100); // Small delay to allow session restoration

      return () => clearTimeout(timer);
    }
  }, [hasClerk, isLoaded, isSignedIn, navigate, hasInitialized]);

  // Show loading while determining where to redirect
  if (!hasClerk || (hasClerk && !isLoaded) || !hasInitialized) {
    return <LoadingScreen full />;
  }

  // Show landing page for unauthenticated users
  return <LandingPage />;
}

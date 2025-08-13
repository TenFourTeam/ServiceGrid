import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";

// Automatically signs the user out when they leave the page or app becomes inactive.
export default function AutoSignOut() {
  const { isSignedIn, signOut } = useAuth();
  const idleTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isSignedIn) return;

    const signOutSafely = () => {
      try {
        void signOut();
      } catch {}
    };
    
    // Only sign out after extended inactivity (30 minutes)
    const onVisibilityChange = () => {
      if (document.hidden) {
        // Set timeout to sign out after 30 minutes of inactivity
        idleTimeoutRef.current = setTimeout(() => {
          signOutSafely();
        }, 30 * 60 * 1000);
      } else {
        // Clear timeout if user returns
        if (idleTimeoutRef.current) {
          clearTimeout(idleTimeoutRef.current);
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [isSignedIn, signOut]);

  return null;
}

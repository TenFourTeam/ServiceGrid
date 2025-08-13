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

    // Sign out when page is hidden (tab close, navigate away)
    const onPageHide = () => signOutSafely();
    
    // Sign out when window is about to unload
    const onBeforeUnload = () => signOutSafely();
    
    // Sign out when page becomes hidden for extended period
    const onVisibilityChange = () => {
      if (document.hidden) {
        // Set timeout to sign out after 5 minutes of inactivity
        idleTimeoutRef.current = setTimeout(() => {
          signOutSafely();
        }, 5 * 60 * 1000);
      } else {
        // Clear timeout if user returns
        if (idleTimeoutRef.current) {
          clearTimeout(idleTimeoutRef.current);
        }
      }
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [isSignedIn, signOut]);

  return null;
}

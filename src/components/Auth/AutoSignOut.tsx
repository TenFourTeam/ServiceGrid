import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

// Automatically signs the user out when they leave the page.
// Keep it simple to avoid unexpected sign-outs on next load.
export default function AutoSignOut() {
  const { isSignedIn, signOut } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;

    const onPageHide = () => {
      try {
        // Best-effort sign out without blocking navigation
        void signOut();
      } catch {}
    };

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [isSignedIn, signOut]);

  return null;
}

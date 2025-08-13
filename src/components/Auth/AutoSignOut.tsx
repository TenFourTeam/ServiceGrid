import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

// Automatically signs the user out when they leave the page.
// Also completes sign-out on next load if the previous attempt was interrupted.
const STORAGE_KEY = "sg_auto_signout_pending";

export default function AutoSignOut() {
  const { isSignedIn, signOut } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;

    // Complete any pending sign-out from a previous pagehide
    try {
      const pending = localStorage.getItem(STORAGE_KEY);
      if (pending) {
        localStorage.removeItem(STORAGE_KEY);
        void signOut();
      }
    } catch {}

    const onPageHide = () => {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
        // Best-effort sign out without blocking navigation
        void signOut();
      } catch {}
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") onPageHide();
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isSignedIn, signOut]);

  return null;
}

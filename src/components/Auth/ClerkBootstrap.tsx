import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";

// Runs in background when signed in to ensure profile mapping, default business,
// and welcome email are set up via the clerk-bootstrap edge function.
// This component is non-blocking and doesn't prevent the UI from loading.
export default function ClerkBootstrap() {
  const { isSignedIn, getToken } = useClerkAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      ranRef.current = false; // Reset on sign out
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;
    
    // Run bootstrap in background without blocking UI
    queueMicrotask(async () => {
      try {
        await edgeFetchJson("clerk-bootstrap", getToken, { method: "POST" });
      } catch (e) {
        // Non-fatal; just log and continue
        console.warn("[ClerkBootstrap] bootstrap failed", e);
      }
    });
  }, [isSignedIn, getToken]);

  return null;
}

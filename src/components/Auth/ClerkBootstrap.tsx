import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";

// Runs once per tab when signed in to ensure profile mapping, default business,
// and welcome email are set up via the clerk-bootstrap edge function.
export default function ClerkBootstrap() {
  const { isSignedIn, getToken } = useClerkAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    console.log("[ClerkBootstrap] Auth state changed:", { isSignedIn });
    if (!isSignedIn) {
      ranRef.current = false; // Reset on sign out
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;
    console.log("[ClerkBootstrap] Starting bootstrap process...");
    (async () => {
      try {
        console.log("[ClerkBootstrap] Calling clerk-bootstrap edge function...");
        const result = await edgeFetchJson("clerk-bootstrap", getToken, { method: "POST" });
        console.log("[ClerkBootstrap] Bootstrap completed successfully:", result);
      } catch (e) {
        // Non-fatal; log and continue
        console.warn("[ClerkBootstrap] bootstrap failed", e);
      }
    })();
  }, [isSignedIn, getToken]);

  return null;
}

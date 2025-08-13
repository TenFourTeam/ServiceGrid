import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";

// Runs once per tab when signed in to ensure profile mapping, default business,
// and welcome email are set up via the clerk-bootstrap edge function.
export default function ClerkBootstrap() {
  const { isSignedIn, getToken } = useClerkAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn) return;
    if (ranRef.current) return;
    ranRef.current = true;
    (async () => {
      try {
        await edgeFetchJson("clerk-bootstrap", getToken, { method: "POST" });
        // Intentionally silent; this should be transparent to the user
      } catch (e) {
        // Non-fatal; log and continue
        console.warn("[ClerkBootstrap] bootstrap failed", e);
      }
    })();
  }, [isSignedIn, getToken]);

  return null;
}

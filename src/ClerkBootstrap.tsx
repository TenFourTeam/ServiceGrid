import React, { useEffect, useState } from "react";
import App from "./App";

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export default function ClerkBootstrap() {
  const [pk, setPk] = useState<string | null>(null);
  const [ClerkProviderComp, setClerkProviderComp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/clerk-publishable-key`);
        if (!r.ok) throw new Error(`Failed to fetch Clerk key (${r.status})`);
        const data = await r.json();
        if (!data.publishableKey) throw new Error("No publishableKey in response");
        if (cancelled) return;
        setPk(data.publishableKey);
        const mod = await import("@clerk/clerk-react");
        if (cancelled) return;
        setClerkProviderComp(() => mod.ClerkProvider);
      } catch (e: any) {
        console.error("[ClerkBootstrap]", e);
        if (!cancelled) setError(e.message || String(e));
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  if (error || !pk || !ClerkProviderComp) {
    // Gracefully continue without Clerk so existing Supabase auth still works
    return <App />;
  }

  const ClerkProvider = ClerkProviderComp;
  return (
    <ClerkProvider publishableKey={pk}>
      <App />
    </ClerkProvider>
  );
}


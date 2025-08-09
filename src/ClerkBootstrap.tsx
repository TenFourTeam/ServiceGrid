import React, { useEffect, useState } from "react";
import App from "./App";
import { ClerkRuntimeProvider } from "./components/Auth/ClerkRuntime";
import LoadingScreen from "./components/LoadingScreen";
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

  if (!pk || !ClerkProviderComp) {
    return <LoadingScreen />;
  }

  if (error) {
    return <div role="alert">Authentication failed to initialize: {error}</div>;
  }

  const ClerkProvider = ClerkProviderComp;
  return (
    <ClerkProvider publishableKey={pk}>
      <ClerkRuntimeProvider hasClerk={true}>
        <App />
      </ClerkRuntimeProvider>
    </ClerkProvider>
  );
}


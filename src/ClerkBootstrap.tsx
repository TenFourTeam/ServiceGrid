import React, { useEffect, useState } from "react";
import App from "./App";
import { ClerkRuntimeProvider } from "./components/Auth/ClerkRuntime";
import LoadingScreen from "./components/LoadingScreen";
import { edgePublicJson } from "@/utils/edgeApi";
export default function ClerkBootstrap() {
  const [pk, setPk] = useState<string | null>(null);
  const [ClerkProviderComp, setClerkProviderComp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await edgePublicJson("clerk-publishable-key");
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

  if (error) {
    return <div role="alert">Authentication failed to initialize: {error}</div>;
  }

  if (!pk || !ClerkProviderComp) {
    return <LoadingScreen />;
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


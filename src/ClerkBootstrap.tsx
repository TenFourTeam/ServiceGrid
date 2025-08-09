import React, { useEffect, useState } from "react";
import App from "./App";
import { ClerkProvider } from "@clerk/clerk-react";

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export default function ClerkBootstrap() {
  const [pk, setPk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch publishable key from Edge Function (public)
    fetch(`${SUPABASE_URL}/functions/v1/clerk-publishable-key`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to fetch Clerk key (${r.status})`);
        const data = await r.json();
        if (!data.publishableKey) throw new Error("No publishableKey in response");
        setPk(data.publishableKey);
      })
      .catch((e) => {
        console.error("[ClerkBootstrap]", e);
        setError(String(e));
      });
  }, []);

  if (error) {
    // Gracefully continue without Clerk so existing Supabase auth still works
    return <App />;
  }

  if (!pk) {
    // Keep initial paint snappy; App uses its own Suspense loaders
    return <App />;
  }

  return (
    <ClerkProvider publishableKey={pk}>
      <App />
    </ClerkProvider>
  );
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useAuth } from "@/components/Auth/AuthProvider";

export default function NylasStartPage() {
  const { session } = useAuth();
  const { getToken, isSignedIn } = useClerkAuth();

  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectUri = useMemo(
    () => `${window.location.origin}/nylas/callback`,
    []
  );

  async function authHeader(): Promise<Record<string, string>> {
    const supaToken = session?.access_token;
    if (supaToken) return { Authorization: `Bearer ${supaToken}` };
    if (isSignedIn) {
      const clerkToken = await getToken();
      if (clerkToken) return { Authorization: `Bearer ${clerkToken}` };
    }
    return {};
  }

  const makeAbsolute = (u: string) => {
    if (!u) return u as string;
    if (/^https?:\/\//i.test(u)) return u;
    const path = u.startsWith("/") ? u : `/${u}`;
    // Default to US region host; adjust if your tenant is in a different region
    return `https://api.us.nylas.com${path}`;
  };

  const openNow = async (url: string) => {
    // Try popup first
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      // Copy to clipboard as fallback
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Authorization link copied",
          description: "Paste it into a new tab if none opened.",
        });
      } catch {}
      // Try programmatic <a> click
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      // Last resort: top-level navigation
      try {
        window.top?.location?.assign(url);
      } catch {
        window.location.href = url;
      }
    }
  };

  const start = async () => {
    setBusy(true);
    try {
      const headers = await authHeader();
      const { data, error } = await supabase.functions.invoke(
        "nylas-auth-start",
        { body: { redirect_uri: redirectUri }, headers }
      );
      if (error) {
        console.error("nylas-auth-start error", error);
        toast({
          title: "Failed to start",
          description: String(error.message ?? "Unknown error"),
          variant: "destructive",
        });
        return;
      }
      const rawUrl = (data?.url as string) || "";
      const url = makeAbsolute(rawUrl);
      setAuthUrl(url);
      // Attempt to open immediately to honor user gesture on initial load
      await openNow(url);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Kick off immediately on mount
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Starting Nylas authorization…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {busy
              ? "Opening authorization in a new tab…"
              : authUrl
              ? "If nothing opened, use the buttons below."
              : "Preparing authorization link…"}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => authUrl && openNow(authUrl)} disabled={!authUrl}>
              Open Nylas now
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!authUrl) return;
                try {
                  await navigator.clipboard.writeText(authUrl);
                  toast({ title: "Link copied", description: "Paste into a new tab." });
                } catch {}
              }}
              disabled={!authUrl}
            >
              Copy link
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

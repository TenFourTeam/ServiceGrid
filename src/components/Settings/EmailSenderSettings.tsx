import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useAuth } from "@/components/Auth/AuthProvider";

// Minimal sender row (Nylas only)
type SenderRow = {
  id: string;
  user_id: string;
  provider: string;
  from_email: string;
  from_name: string | null;
  reply_to: string | null;
  nylas_grant_id: string | null;
  verified: boolean;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export default function EmailSenderSettings() {
  const { session } = useAuth();
  const { getToken, isSignedIn } = useClerkAuth();

  // Prefer Supabase JWT; fall back to Clerk token
  async function authHeader(): Promise<Record<string, string>> {
    const supaToken = session?.access_token;
    if (supaToken) return { Authorization: `Bearer ${supaToken}` };
    if (isSignedIn) {
      const clerkToken = await getToken();
      if (clerkToken) return { Authorization: `Bearer ${clerkToken}` };
    }
    return {};
  }

  const { data: sender, refetch, isFetching } = useQuery({
    queryKey: ["email-sender"],
    queryFn: async (): Promise<SenderRow | null> => {
      const headers = await authHeader();
      const { data, error } = await supabase.functions.invoke("email-sender-get", { headers });
      if (error) {
        console.error("load sender error", error);
        return null;
        }
      return (data?.sender as SenderRow) ?? null;
    },
  });

  const hasNylas = !!sender?.nylas_grant_id && sender?.provider === "nylas";
  const fromEmail = sender?.from_email ?? "";

  const onConnect = async () => {
    const redirect_uri = `${window.location.origin}/nylas/callback`;
    const headers = await authHeader();
    const { data, error } = await supabase.functions.invoke("nylas-auth-start", { body: { redirect_uri }, headers });
    if (error) {
      console.error("nylas-auth-start error", error);
      toast({ title: "Failed to start connection", description: String(error.message ?? "Unknown error"), variant: "destructive" });
      return;
    }
    const rawUrl = data?.url as string | undefined;
    if (!rawUrl) {
      toast({ title: "Failed to start connection", description: "Missing authorize URL", variant: "destructive" });
      return;
    }

    // Ensure absolute URL (avoid relative "/v3/connect/authorize" in SPA)
    const makeAbsolute = (u: string) => {
      if (/^https?:\/\//i.test(u)) return u;
      if (u.startsWith("/")) return `https://api.us.nylas.com${u}`;
      if (u.startsWith("v3/")) return `https://api.us.nylas.com/${u}`;
      return u;
    };
    const safeUrl = makeAbsolute(rawUrl);
    console.log("Nylas authorize URL:", { rawUrl, safeUrl });

    // Open in a new tab to avoid iframe X-Frame-Options blocking
    toast({ title: "Opening Nylas...", description: "If a new tab didn't open, please allow pop-ups." });
    const win = window.open(safeUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      // Fallback if pop-ups are blocked
      const a = document.createElement("a");
      a.href = safeUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      // Last resort: navigate top-level (will leave the builder)
      try {
        window.top?.location?.assign(safeUrl);
      } catch {
        window.location.href = safeUrl;
      }
    }
  };

  const onDisconnect = async () => {
    const headers = await authHeader();
    const { error } = await supabase.functions.invoke("nylas-disconnect", { headers });
    if (error) {
      toast({ title: "Failed to disconnect", description: String(error.message ?? "Unknown error"), variant: "destructive" });
      return;
    }
    toast({ title: "Disconnected", description: "Mailbox disconnected." });
    refetch();
  };

  // Trigger a refresh when we land here after Nylas flow
  useMemo(() => {
    // Best-effort refresh on mount
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Sending</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-sm">
            {hasNylas
              ? `Connected via Nylas: ${fromEmail}`
              : "Send from your own mailbox by connecting it with Nylas (recommended)."}
          </p>
          <div className="flex items-center gap-2">
            {!hasNylas ? (
              <Button onClick={onConnect}>Connect mailbox</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>Refresh</Button>
                <Button variant="outline" onClick={onDisconnect}>Disconnect</Button>
              </>
            )}
          </div>
        </div>

        {hasNylas && (
          <div className="text-sm text-muted-foreground">
            Status: Connected ✅ (provider: {sender?.status || "connected"})
          </div>
        )}
      </CardContent>
    </Card>
  );
}

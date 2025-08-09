import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useAuth } from "@/components/Auth/AuthProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      if (!u) return u as string;
      if (/^https?:\/\//i.test(u)) return u;
      const path = u.startsWith("/") ? u : `/${u}`;
      return `https://api.us.nylas.com${path}`;
    };
    const safeUrl = makeAbsolute(rawUrl);
    console.log("Nylas authorize URL:", { rawUrl, safeUrl });

    // Open in a new tab to avoid iframe X-Frame-Options blocking
    toast({ title: "Opening Nylas...", description: "If a new tab didn't open, please allow pop-ups." });
    const win = window.open(safeUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      // Copy URL to clipboard as a fallback
      try {
        await navigator.clipboard.writeText(safeUrl);
        toast({ title: "Authorization link copied", description: "Paste it into a new tab if one didn’t open." });
      } catch {}
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

  // SendGrid domain-based sending state
  const [businessEmail, setBusinessEmail] = useState("");

  const domainsQuery = useQuery({
    queryKey: ["email-domains"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_domains")
        .select("id, domain, status, dns_records, default_from_email, default_from_name, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("load domains error", error);
        return [] as any[];
      }
      return data || [];
    },
  });

  const startDomainSetup = async () => {
    const domain = (businessEmail.split("@")[1] || "").toLowerCase();
    if (!domain) {
      toast({ title: "Enter a valid email", description: "We use it to detect your domain (e.g. yourname@yourcompany.com).", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("sendgrid-domain-init", {
      body: { email: businessEmail },
    });
    if (error || (data as any)?.error) {
      const msg = (error as any)?.message || (data as any)?.error || "Failed to start domain setup";
      toast({ title: "Domain setup failed", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Domain setup started", description: `Add the DNS records below to ${domain} and then click Verify.` });
    domainsQuery.refetch();
  };

  const verifyDomain = async (domain: string) => {
    const { data, error } = await supabase.functions.invoke("sendgrid-domain-verify", { body: { domain } });
    if (error || (data as any)?.error) {
      const msg = (error as any)?.message || (data as any)?.error || "Verification failed";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Verification requested", description: "We checked with SendGrid. If records are correct it will mark as verified." });
    domainsQuery.refetch();
  };

  return (
    <div className="space-y-6">
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
                <>
                  <Button onClick={onConnect}>Connect mailbox</Button>
                  <Button variant="ghost" asChild>
                    <a href="/nylas/start" target="_blank" rel="noopener noreferrer">Open in new tab</a>
                  </Button>
                </>
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

      <Card>
        <CardHeader>
          <CardTitle>Domain-based sending (SendGrid)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessEmail">Your business email</Label>
            <div className="flex gap-2">
              <Input id="businessEmail" placeholder="you@yourcompany.com" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
              <Button onClick={startDomainSetup}>Start setup</Button>
            </div>
            <p className="text-xs text-muted-foreground">We'll detect your domain and generate DNS records. After adding them, click Verify.</p>
          </div>

          <div className="space-y-3">
            {domainsQuery.data?.length ? (
              domainsQuery.data.map((d: any) => (
                <div key={d.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{d.domain}</div>
                      <div className="text-xs text-muted-foreground">Status: {d.status}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => verifyDomain(d.domain)}>Verify</Button>
                    </div>
                  </div>
                  {d.dns_records && Array.isArray(d.dns_records) && (
                    <div className="mt-3 text-xs">
                      <div className="font-medium">DNS records to add:</div>
                      <ul className="list-disc pl-6 mt-1 space-y-1">
                        {d.dns_records.map((r: any, i: number) => (
                          <li key={i}><code>{r.type}</code> {r.host || r.name} → {r.data || r.value}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No domains yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

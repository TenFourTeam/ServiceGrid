
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function NylasCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const code = params.get("code");
  const [loading, setLoading] = useState(false);

useEffect(() => {
  if (!code) return;
  setLoading(true);
  const run = async () => {
    const redirect_uri = `${window.location.origin}/nylas/callback`;
    // Try Supabase token first, else Clerk
    const { data: sess } = await supabase.auth.getSession();
    let headers: Record<string, string> = {};
    if (sess.session?.access_token) headers = { Authorization: `Bearer ${sess.session.access_token}` };
    else {
      try {
        const { getToken } = await import("@clerk/clerk-react");
        const token = await (getToken as any)();
        if (token) headers = { Authorization: `Bearer ${token}` };
      } catch {}
    }
    const { data, error } = await supabase.functions.invoke("nylas-exchange-code", { body: { code, redirect_uri }, headers });
    if (error) {
      console.error("nylas-exchange-code error", error);
      toast({ title: "Connection failed", description: String(error.message ?? "Unknown error"), variant: "destructive" });
    } else {
      toast({ title: "Mailbox connected", description: "You're ready to send emails from your mailbox." });
      console.log("nylas-exchange-code success", data);
      navigate("/settings", { replace: true });
    }
    setLoading(false);
  };
  run();
}, [code, navigate]);

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connecting your mailbox…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!code ? (
            <>
              <p className="text-sm text-muted-foreground">Missing authorization code in callback.</p>
              <Button onClick={() => navigate("/settings")}>Back to Settings</Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loading ? "Finalizing connection…" : "Almost done…"}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

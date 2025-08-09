import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const sanitizeEmail = (v: string) => v.trim().toLowerCase();
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function AuthResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = "Reset password • TenFour Lawn";
    const desc = "Request a password reset link for your account.";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute('content', desc);

    const canonical = document.querySelector('link[rel="canonical"]') || (() => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      document.head.appendChild(l);
      return l;
    })();
    canonical.setAttribute('href', window.location.href);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qEmail = params.get("email");
    if (qEmail) setEmail(sanitizeEmail(qEmail));
  }, [location.search]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const em = sanitizeEmail(email);
    if (!isValidEmail(em)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo });
      if (error) throw error;
      setMessage(`Password reset link sent to ${em}. Check your inbox.`);
      toast?.({ title: "Reset email sent", description: `We've sent a password reset link to ${em}.` });
    } catch (err: any) {
      const raw = String(err?.message ?? "");
      let friendly = raw || "Could not send reset email.";
      if (/rate|limit/i.test(raw)) friendly = "Too many requests. Please wait and try again.";
      if (/invalid/i.test(raw)) friendly = "That email address looks invalid.";
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>We'll email you a link to set a new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setEmail(sanitizeEmail(email))} required placeholder="you@example.com" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading || !isValidEmail(email)}>
              {loading ? "Please wait…" : "Send reset link"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            <button className="underline underline-offset-4" onClick={() => navigate("/auth")}>Back to sign in</button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

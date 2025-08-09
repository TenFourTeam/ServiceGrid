import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/Auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = useMemo(() => (location.state as any)?.from?.pathname ?? "/calendar", [location.state]);

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = mode === "signIn" ? "Sign in • TenFour Lawn" : "Create account • TenFour Lawn";
    const desc = mode === "signIn" ? "Sign in to access your TenFour Lawn console." : "Create your TenFour Lawn account.";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute('content', desc);
  }, [mode]);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(from, { replace: true });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
      }
    } catch (err: any) {
      const raw = String(err?.message ?? "");
      let friendly = raw || "Something went wrong";
      if (mode === "signIn" && /invalid login credentials/i.test(raw)) {
        friendly = "Invalid email or password.";
      } else if (/email address .* is invalid/i.test(raw)) {
        friendly = "That email address looks invalid.";
      } else if (/confirm|verify/i.test(raw)) {
        friendly = "Please verify your email to continue. You can resend the verification email below.";
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setError(null);
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      setMessage(`Verification email sent to ${email}. Check your inbox and spam.`);
      toast?.({
        title: "Verification email sent",
        description: `We've sent a verification email to ${email}.`,
      });
    } catch (err: any) {
      const raw = String(err?.message ?? "");
      let friendly = raw || "Could not resend the email.";
      if (/invalid/i.test(raw)) friendly = "That email address looks invalid.";
      if (/rate|limit/i.test(raw)) friendly = "Too many requests. Please wait a moment and try again.";
      setError(friendly);
      toast?.({
        title: "Resend failed",
        description: friendly,
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "signIn" ? "Welcome back" : "Create your account"}</CardTitle>
          <CardDescription>{mode === "signIn" ? "Sign in to continue" : "Start managing your jobs and invoices"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            {(((mode === "signUp") && !!message) || (error && /confirm|verify/i.test(error))) && (
              <Button type="button" variant="outline" className="w-full" onClick={onResend} disabled={resending || !email}>
                {resending ? "Resending…" : "Resend verification email"}
              </Button>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            {mode === "signIn" ? (
              <button className="underline underline-offset-4" onClick={() => setMode("signUp")}>Don't have an account? Sign up</button>
            ) : (
              <button className="underline underline-offset-4" onClick={() => setMode("signIn")}>Already have an account? Sign in</button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

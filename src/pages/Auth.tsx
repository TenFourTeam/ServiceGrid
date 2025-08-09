import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/Auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const sanitizeEmail = (v: string) => v.trim().toLowerCase();
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

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
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [accountExists, setAccountExists] = useState(false);

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

    const canonical = document.querySelector('link[rel="canonical"]') || (() => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      document.head.appendChild(l);
      return l;
    })();
    canonical.setAttribute('href', window.location.href);
  }, [mode]);

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setAccountExists(false);

    const em = sanitizeEmail(email);
    if (!isValidEmail(em)) {
      setError("Please enter a valid email address.");
      return;
    }
    setEmail(em);

    setLoading(true);
    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password });
        if (error) throw error;
        navigate(from, { replace: true });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email: em,
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
      } else if (/email address .* is invalid|invalid email/i.test(raw)) {
        friendly = "That email address looks invalid.";
      } else if (mode === "signUp" && /(already.*registered|already.*exists|user.*registered)/i.test(raw)) {
        friendly = "An account with this email already exists.";
        setAccountExists(true);
      } else if (/confirm|verify/i.test(raw)) {
        friendly = "Please verify your email to continue. You can resend the verification email below.";
      } else if (/rate|limit/i.test(raw)) {
        friendly = "Too many requests. Please wait a moment and try again.";
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    const em = sanitizeEmail(email);
    if (!isValidEmail(em)) {
      setError("Enter a valid email first.");
      return;
    }
    setError(null);
    setResending(true);
    setEmail(em);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: em,
      });
      if (error) throw error;
      setMessage(`Verification email sent to ${em}. Check your inbox and spam.`);
      toast?.({
        title: "Verification email sent",
        description: `We've sent a verification email to ${em}.`,
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
              <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setAccountExists(false); }} onBlur={() => setEmail(sanitizeEmail(email))} required placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signIn" && (
                  <button
                    type="button"
                    className="text-xs underline underline-offset-4"
                    onClick={() => navigate(`/auth/reset${email ? `?email=${encodeURIComponent(sanitizeEmail(email))}` : ""}`)}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            {accountExists && (
              <div className="mt-2">
                <Alert>
                  <AlertTitle>Account already exists</AlertTitle>
                  <AlertDescription>
                    It looks like there’s already an account for {email}. Choose an option below.
                  </AlertDescription>
                </Alert>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Button type="button" onClick={() => { setMode("signIn"); }}>
                    Sign in instead
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate(`/auth/reset?email=${encodeURIComponent(email)}`)}>
                    Reset password
                  </Button>
                  <Button type="button" variant="outline" onClick={onResend} disabled={resending || !isValidEmail(email)}>
                    {resending ? "Resending…" : "Resend verification"}
                  </Button>
                </div>
              </div>
            )}
            {(((mode === "signUp") && !!message) || (error && /confirm|verify/i.test(error))) && (
              <Button type="button" variant="outline" className="w-full" onClick={onResend} disabled={resending || !isValidEmail(email)}>
                {resending ? "Resending…" : "Resend verification email"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Account emails are sent from noreply@mail.app.supabase.io. Check your spam/junk if you don't see them.
            </p>
            <Button type="submit" className="w-full" disabled={loading || !isValidEmail(email) || !password}>
              {loading ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            {mode === "signIn" ? (
              <button className="underline underline-offset-4" onClick={() => { setAccountExists(false); setMode("signUp"); }}>Don't have an account? Sign up</button>
            ) : (
              <button className="underline underline-offset-4" onClick={() => { setAccountExists(false); setMode("signIn"); }}>Already have an account? Sign in</button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

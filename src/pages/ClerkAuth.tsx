import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useHasClerk } from "@/components/Auth/ClerkRuntime";

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export default function ClerkAuthPage() {
  const hasClerk = useHasClerk();
  const location = useLocation();
  const from: any = (location.state as any)?.from;
  const redirectTarget = from?.pathname ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : "/";

  if (!hasClerk) {
    return <LoadingScreen />;
  }

  return <ClerkAuthInner redirectTarget={redirectTarget} />;
}

function ClerkAuthInner({ redirectTarget }: { redirectTarget: string }) {
  const { getToken, isSignedIn } = useClerkAuth();
  const [who, setWho] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  useEffect(() => {
    document.title = "Sign In • TenFour Lawn";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Sign in or create an account with Clerk for TenFour Lawn');
  }, []);

  const callWhoAmI = async () => {
    try {
      setLoading(true);
      setWho("");
      const token = await getToken();
      if (!token) throw new Error("No Clerk token");
      const res = await fetch(`${SUPABASE_URL}/functions/v1/clerk-whoami`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWho(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setWho(`Error: ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto max-w-2xl py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Secure sign-in powered by Clerk. Continue to your workspace after authentication.</p>
        <link rel="canonical" href={`${window.location.origin}/clerk-auth`} />
      </header>

      <section className="space-y-6">
        <SignedOut>
          <Card>
            <CardHeader>
              <CardTitle>Sign in or create your account</CardTitle>
              <CardDescription>Access your TenFour Lawn workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <SignInButton mode="modal" fallbackRedirectUrl={redirectTarget}>
                  <Button>Sign in</Button>
                </SignInButton>
                <SignUpButton mode="modal" fallbackRedirectUrl={redirectTarget}>
                  <Button variant="secondary">Sign up</Button>
                </SignUpButton>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">By continuing, you agree to the Terms and Privacy Policy.</p>
            </CardContent>
          </Card>
        </SignedOut>

        <SignedIn>
          <Card>
            <CardHeader>
              <CardTitle>You're signed in</CardTitle>
              <CardDescription>Continue to your destination or explore the app.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <UserButton />
                <Button asChild>
                  <Link to={redirectTarget}>Continue</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/calendar">Open Calendar</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/">Go to Home</Link>
                </Button>
              </div>

              <div className="mt-6">
                <Collapsible open={devOpen} onOpenChange={setDevOpen}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Developer tools</div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">{devOpen ? "Hide" : "Show"}</Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-3">
                      {isSignedIn && (
                        <Button variant="outline" onClick={callWhoAmI} disabled={loading}>
                          {loading ? 'Checking…' : 'Verify token (whoami)'}
                        </Button>
                      )}
                      {who && (
                        <pre className="rounded-md border p-4 text-sm overflow-auto" aria-live="polite">{who}</pre>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>
        </SignedIn>
      </section>
    </main>
  );
}

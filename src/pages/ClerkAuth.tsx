import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export default function ClerkAuthPage() {
  const { getToken, isSignedIn } = useAuth();
  const [who, setWho] = useState<string>("");
  const [loading, setLoading] = useState(false);

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
        <link rel="canonical" href={`${window.location.origin}/clerk-auth`} />
      </header>

      <section className="space-y-4">
        <SignedOut>
          <div className="flex gap-3">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="secondary">Sign up</Button>
            </SignUpButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="flex items-center gap-3">
            <UserButton />
            {isSignedIn && (
              <Button variant="outline" onClick={callWhoAmI} disabled={loading}>
                {loading ? 'Checking…' : 'Verify token (whoami)'}
              </Button>
            )}
          </div>
          {who && (
            <pre className="mt-4 rounded-md border p-4 text-sm overflow-auto" aria-live="polite">{who}</pre>
          )}
        </SignedIn>
      </section>
    </main>
  );
}

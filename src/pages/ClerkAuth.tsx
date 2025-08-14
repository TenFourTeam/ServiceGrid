import { useEffect, useRef } from "react";
import { SignedOut, SignInButton, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";

export default function ClerkAuthPage() {
  const location = useLocation();
  const from: any = (location.state as any)?.from;
  const redirectTarget = from?.pathname ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : "/";

  return <ClerkAuthInner redirectTarget={redirectTarget} />;
}

function ClerkAuthInner({ redirectTarget }: { redirectTarget: string }) {
  const { isSignedIn } = useClerkAuth();
  const navigate = useNavigate();
  const autoOpenRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    document.title = "Sign In • ServiceGrid";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Sign in or create an account with Clerk for ServiceGrid");
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isSignedIn, redirectTarget, navigate]);

  useEffect(() => {
    if (!isSignedIn) {
      const t = setTimeout(() => autoOpenRef.current?.click(), 0);
      return () => clearTimeout(t);
    }
  }, [isSignedIn]);

  return (
    <main className="container mx-auto max-w-md py-10">
      <link rel="canonical" href={`${window.location.origin}/clerk-auth`} />

      <SignedOut>
        <SignInButton
          mode="modal"
          forceRedirectUrl={redirectTarget}
          fallbackRedirectUrl={redirectTarget}
          appearance={{ elements: { modalBackdrop: "fixed inset-0 bg-background" } }}
        >
          <Button ref={autoOpenRef} className="sr-only">Open sign in</Button>
        </SignInButton>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Opening sign-in… If nothing happens, {" "}
          <button className="underline" onClick={() => autoOpenRef.current?.click()}>
            click here
          </button>.
        </p>
      </SignedOut>
    </main>
  );
}

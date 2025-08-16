import { useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import { EnhancedSignIn } from "@/components/Auth/EnhancedSignIn";

export default function ClerkAuthPage() {
  const location = useLocation();
  const from: any = (location.state as any)?.from;
  const redirectTarget = from?.pathname ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : "/";

  return <ClerkAuthInner redirectTarget={redirectTarget} />;
}

function ClerkAuthInner({ redirectTarget }: { redirectTarget: string }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");

  useEffect(() => {
    document.title = `${authMode === "sign-in" ? "Sign In" : "Create Account"} • ServiceGrid`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", 
        authMode === "sign-in" 
          ? "Sign in to your ServiceGrid account"
          : "Create a new ServiceGrid account and start managing your business"
      );
    }
  }, [authMode]);

  useEffect(() => {
    if (isSignedIn && isLoaded) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isSignedIn, isLoaded, redirectTarget, navigate]);

  return (
    <main className="container mx-auto max-w-md py-10 px-4">
      <link rel="canonical" href={`${window.location.origin}/clerk-auth`} />
      
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Welcome to ServiceGrid
        </h1>
        <p className="text-muted-foreground">
          Streamline your service business operations
        </p>
      </div>

      <EnhancedSignIn
        redirectTo={redirectTarget}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </main>
  );
}

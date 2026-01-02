import { useEffect, useState } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import { EnhancedSignIn } from "@/components/Auth/EnhancedSignIn";
import { useAuthApi } from "@/hooks/useAuthApi";

export default function ClerkAuthPage() {
  const location = useLocation();
  const from: any = (location.state as any)?.from;
  const redirectTarget = from?.pathname ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : "/";

  return <ClerkAuthInner redirectTarget={redirectTarget} />;
}

function ClerkAuthInner({ redirectTarget }: { redirectTarget: string }) {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const authApi = useAuthApi();
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [referralProcessed, setReferralProcessed] = useState(false);

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

  // Handle referral completion after signup
  useEffect(() => {
    const handleReferral = async () => {
      if (isSignedIn && isLoaded && user && !referralProcessed) {
        const referralCode = sessionStorage.getItem('referral_code');
        
        if (referralCode) {
          console.log('Processing referral for new user:', { referralCode, userId: user.id });
          
          try {
            await authApi.invoke('complete-referral', {
              method: 'POST',
              body: {
                referral_code: referralCode,
                user_email: user.primaryEmailAddress?.emailAddress,
                user_id: user.id
              }
            });
            
            // Clear the referral code from storage
            sessionStorage.removeItem('referral_code');
            console.log('Referral completed successfully');
          } catch (error) {
            console.error('Failed to complete referral:', error);
          }
        }
        
        setReferralProcessed(true);
        navigate(redirectTarget, { replace: true });
      }
    };

    handleReferral();
  }, [isSignedIn, isLoaded, user, redirectTarget, navigate, authApi, referralProcessed]);

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

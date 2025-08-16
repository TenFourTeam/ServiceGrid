import { useState } from "react";
import { SignInButton, useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface EnhancedSignInProps {
  redirectTo?: string;
  mode?: "sign-in" | "sign-up";
  onModeChange?: (mode: "sign-in" | "sign-up") => void;
}

export function EnhancedSignIn({ 
  redirectTo = "/", 
  mode = "sign-in",
  onModeChange 
}: EnhancedSignInProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoaded) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (isSignedIn) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">You're already signed in. Redirecting...</p>
        </CardContent>
      </Card>
    );
  }

  const handleAuthStart = () => {
    setIsLoading(true);
    
    // Add auth event listeners for better UX
    const cleanup = () => {
      setIsLoading(false);
    };

    // Cleanup after a reasonable timeout
    setTimeout(cleanup, 5000);
    
    return cleanup;
  };

  const handleAuthError = (error: any) => {
    console.error('[EnhancedSignIn] Auth error:', error);
    setIsLoading(false);
    
    // User-friendly error messages
    const message = error?.message || 'Authentication failed. Please try again.';
    if (message.toLowerCase().includes('email') && message.toLowerCase().includes('exist')) {
      toast.error('This email is already registered. Try signing in instead.');
    } else if (message.toLowerCase().includes('password')) {
      toast.error('Password requirements not met. Please choose a stronger password.');
    } else {
      toast.error(message);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {mode === "sign-in" ? (
            <>
              <LogIn className="h-5 w-5" />
              Welcome Back
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              Create Account
            </>
          )}
        </CardTitle>
        <CardDescription>
          {mode === "sign-in" 
            ? "Sign in to your ServiceGrid account"
            : "Join ServiceGrid and start managing your business"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <SignInButton
          mode="modal"
          forceRedirectUrl={redirectTo}
          fallbackRedirectUrl={redirectTo}
          appearance={{
            elements: {
              modalBackdrop: "fixed inset-0 bg-background/80 backdrop-blur-sm",
              card: "bg-card border-border",
              headerTitle: "text-foreground",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton: "border-border hover:bg-accent",
              formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
              footerActionLink: "text-primary hover:text-primary/80"
            },
          }}
        >
          <Button 
            onClick={handleAuthStart}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "sign-in" ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              <>
                {mode === "sign-in" ? (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </>
            )}
          </Button>
        </SignInButton>

        {onModeChange && (
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {mode === "sign-in" ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => onModeChange(mode === "sign-in" ? "sign-up" : "sign-in")}
              className="text-primary hover:text-primary/80 underline"
            >
              {mode === "sign-in" ? "Create one" : "Sign in"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
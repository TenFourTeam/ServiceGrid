import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth as useClerkAuth, SignedOut, SignInButton } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRedeemInvite } from "@/hooks/useInvites";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, UserPlus, Loader2 } from "lucide-react";

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useClerkAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth-required'>('loading');
  const [message, setMessage] = useState('');
  const autoOpenRef = useRef<HTMLButtonElement | null>(null);
  
  const token = searchParams.get('token');
  const redeemInvite = useRedeemInvite();
  

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link. The token is missing.');
      return;
    }

    if (!isLoaded) {
      return; // Wait for Clerk to load
    }

    if (!isSignedIn) {
      setStatus('auth-required');
      return;
    }

    // If we have a token and user is signed in, redeem the invite
    handleRedeemInvite();
  }, [token, isSignedIn, isLoaded]);

  const handleRedeemInvite = async () => {
    if (!token) return;

    try {
      setStatus('loading');
      const result = await redeemInvite.mutateAsync({ token });
      
      setStatus('success');
      setMessage('You have successfully joined the team!');
      
      toast.success("Welcome!", {
        description: "You have successfully joined the team.",
      });

      // Redirect to calendar after a short delay
      setTimeout(() => {
        navigate('/calendar');
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to redeem invite:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to accept invitation. The link may be expired or invalid.');
      
      toast.error("Error", {
        description: error.message || "Failed to accept invitation",
      });
    }
  };

  // Auto-trigger sign-in when auth is required
  useEffect(() => {
    if (status === 'auth-required' && !isSignedIn) {
      const t = setTimeout(() => autoOpenRef.current?.click(), 0);
      return () => clearTimeout(t);
    }
  }, [status, isSignedIn]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This invitation link is invalid or malformed.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'auth-required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Join the Team</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You've been invited to join a team on ServiceGrid. Opening sign-in to accept your invitation...
            </p>
            <SignedOut>
              <SignInButton
                mode="modal"
                forceRedirectUrl={window.location.href}
                fallbackRedirectUrl={window.location.href}
                appearance={{ elements: { modalBackdrop: "fixed inset-0 bg-background" } }}
              >
                <Button ref={autoOpenRef} className="sr-only">Open sign in</Button>
              </SignInButton>
              <p className="text-sm text-muted-foreground">
                If nothing happens, {" "}
                <button className="underline" onClick={() => autoOpenRef.current?.click()}>
                  click here to sign in
                </button>.
              </p>
            </SignedOut>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
            <CardTitle>Processing Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Please wait while we process your invitation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Welcome to the Team!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Badge variant="secondary" className="mb-4">
              Invitation Accepted
            </Badge>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">
              Redirecting you to the calendar...
            </p>
            <Button onClick={() => navigate('/calendar')} className="w-full">
              Go to Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitation Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{message}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                Go to Home
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
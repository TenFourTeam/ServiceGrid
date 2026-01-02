import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useBusinessAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRedeemInvite } from "@/hooks/useInvites";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, UserPlus, Loader2 } from "lucide-react";

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth-required'>('loading');
  const [message, setMessage] = useState('');
  const hasRedeemed = useRef(false);
  
  const token = searchParams.get('token');
  const redeemInvite = useRedeemInvite();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link. The token is missing.');
      return;
    }

    if (!isLoaded) {
      return; // Wait for auth to load
    }

    if (!isSignedIn) {
      // Store token and redirect to auth page
      sessionStorage.setItem('invite_token', token);
      navigate(`/auth?redirect=/invite?token=${token}`, { replace: true });
      return;
    }

    // If we have a token and user is signed in, redeem the invite
    if (!hasRedeemed.current) {
      hasRedeemed.current = true;
      handleRedeemInvite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isSignedIn, isLoaded]);

  const handleRedeemInvite = async () => {
    if (!token) return;

    try {
      setStatus('loading');
      const result = await redeemInvite.mutateAsync(token);
      
      setStatus('success');
      setMessage(result.message || 'You have successfully joined the team!');
      
      toast.success("Welcome!", {
        description: "You have successfully joined the team.",
      });

      // Clear the stored token
      sessionStorage.removeItem('invite_token');

      // Redirect to calendar after a short delay
      setTimeout(() => {
        navigate('/calendar');
      }, 2000);
      
    } catch (error: Error | unknown) {
      console.error('Failed to redeem invite:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to accept invitation. The link may be expired or invalid.');
      
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to accept invitation",
      });
    }
  };

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
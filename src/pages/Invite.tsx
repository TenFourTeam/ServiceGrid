import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRedeemInvite } from "@/hooks/useInvites";
import { EnhancedSignIn } from "@/components/Auth/EnhancedSignIn";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, UserPlus, Loader2 } from "lucide-react";
import { useAuthApi } from "@/hooks/useAuthApi";

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useClerkAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth-required' | 'invite-validated'>('loading');
  const [message, setMessage] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-up");
  
  const token = searchParams.get('token');
  const redeemInvite = useRedeemInvite();
  const authApi = useAuthApi();
  

  // Validate invite token on page load
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link. The token is missing.');
      return;
    }

    if (!isLoaded) {
      return; // Wait for Clerk to load
    }

    // If already signed in, proceed with manual redemption
    if (isSignedIn) {
      handleRedeemInvite();
      return;
    }

    // For new users, validate the invite first
    validateInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isSignedIn, isLoaded]);

  const validateInvite = async () => {
    if (!token) return;

    try {
      setStatus('loading');
      
      // Call the invite validation endpoint
      const response = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/invite-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error('Failed to validate invitation');
      }

      const result = await response.json();
      
      if (result.valid) {
        setInviteData(result.invite);
        setStatus('invite-validated');
        
        // Store invite context for signup process
        const signupContext = {
          org_id: result.invite.businesses?.clerk_org_id,
          invite_token: token,
          invite_token_hash: result.invite_token_hash,
          business_name: result.invite.businesses?.name,
          inviter_name: result.inviter_name
        };
        
        localStorage.setItem('clerk_signup_context', JSON.stringify(signupContext));
        console.log('🎫 [Invite] Stored signup context:', signupContext);
        
      } else {
        setStatus('error');
        setMessage(result.message || 'This invitation is no longer valid.');
      }
      
    } catch (error: Error | unknown) {
      console.error('Failed to validate invite:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to validate invitation. Please try again.');
    }
  };

  const handleRedeemInvite = async () => {
    if (!token) return;

    try {
      setStatus('loading');
      const result = await redeemInvite.mutateAsync({ token });
      
      setStatus('success');
      setMessage(result.message || 'You have successfully joined the team!');
      
      toast.success("Welcome!", {
        description: "You have successfully joined the team.",
      });

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

  // Handle successful authentication
  useEffect(() => {
    if (isSignedIn && status === 'invite-validated') {
      // User just signed in, redirect to business
      toast.success("Welcome!", {
        description: "You have successfully joined the team.",
      });
      navigate('/calendar');
    }
  }, [isSignedIn, status, navigate]);

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

  if (status === 'invite-validated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>You're Invited!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <p className="text-muted-foreground mb-2">
                  You've been invited to join <strong>{inviteData?.businesses?.name}</strong> as a {inviteData?.role}.
                </p>
                {inviteData?.inviter_name && (
                  <p className="text-sm text-muted-foreground">
                    Invited by {inviteData.inviter_name}
                  </p>
                )}
              </div>
              <Badge variant="secondary">
                Join as {inviteData?.role}
              </Badge>
            </CardContent>
          </Card>

          <div>
            <EnhancedSignIn
              redirectTo="/calendar"
              mode={authMode}
              onModeChange={setAuthMode}
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              By signing up, you'll automatically join {inviteData?.businesses?.name}
            </p>
          </div>
        </div>
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
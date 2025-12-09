import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ArrowLeft, Mail } from 'lucide-react';
import { buildEdgeFunctionUrl } from '@/utils/env';

interface InviteValidation {
  valid: boolean;
  email?: string;
  customerName?: string;
  businessName?: string;
  businessLogo?: string;
  inviteToken?: string;
  error?: string;
}

export default function CustomerInviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [validation, setValidation] = useState<InviteValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function validateInvite() {
      if (!token) {
        setValidation({ valid: false, error: 'No invite token provided' });
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          buildEdgeFunctionUrl('customer-portal-invite-validate', { token })
        );
        const data = await response.json();
        setValidation(data);
      } catch (error) {
        console.error('Error validating invite:', error);
        setValidation({ valid: false, error: 'Failed to validate invite' });
      } finally {
        setIsLoading(false);
      }
    }

    validateInvite();
  }, [token]);

  const handleContinue = () => {
    navigate('/customer-login', {
      state: {
        inviteToken: validation?.inviteToken,
        email: validation?.email,
        customerName: validation?.customerName,
        businessName: validation?.businessName,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validating your invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </Link>

        <Card className="shadow-lg">
          {validation?.valid ? (
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">You're Invited!</CardTitle>
                <CardDescription>
                  {validation.businessName} has invited you to their customer portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Invited as:</p>
                  <p className="font-medium">{validation.customerName}</p>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {validation.email}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button onClick={handleContinue} className="w-full" size="lg">
                    Continue to Sign In
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    You can sign in with Google, magic link, or create a password
                  </p>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl font-bold">Invalid Invite</CardTitle>
                <CardDescription>
                  {validation?.error || 'This invite link is not valid'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {validation?.email && (
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Email:</p>
                    <p className="font-medium">{validation.email}</p>
                    {validation.businessName && (
                      <>
                        <p className="text-sm text-muted-foreground">Business:</p>
                        <p className="font-medium">{validation.businessName}</p>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <Button asChild className="w-full" variant="outline">
                    <Link to="/customer-login">Go to Login</Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    If you already have an account, you can sign in directly
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

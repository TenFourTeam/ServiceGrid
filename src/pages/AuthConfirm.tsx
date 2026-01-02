import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type VerificationStatus = 'verifying' | 'success' | 'error';

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change' | null;
  const redirectTo = searchParams.get('redirect_to');

  useEffect(() => {
    const verifyToken = async () => {
      if (!tokenHash || !type) {
        setStatus('error');
        setErrorMessage('Invalid confirmation link. Missing required parameters.');
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type,
        });

        if (error) {
          console.error('[AuthConfirm] Verification error:', error.message);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }

        setStatus('success');

        // Determine redirect based on type
        let successMessage = 'Email confirmed successfully!';
        let destination = '/calendar';

        switch (type) {
          case 'signup':
          case 'magiclink':
          case 'invite':
            successMessage = 'Email confirmed! Redirecting...';
            destination = '/calendar';
            break;
          case 'recovery':
            successMessage = 'Email verified! You can now reset your password.';
            destination = '/auth?tab=reset-password';
            break;
          case 'email_change':
            successMessage = 'Email updated successfully!';
            destination = '/settings';
            break;
        }

        // Handle redirect_to if provided and same-origin
        if (redirectTo) {
          try {
            const redirectUrl = new URL(redirectTo, window.location.origin);
            // Only use redirect_to if it's same-origin
            if (redirectUrl.origin === window.location.origin) {
              destination = redirectUrl.pathname + redirectUrl.search + redirectUrl.hash;
            }
          } catch {
            // Invalid URL, use default destination
          }
        }

        toast.success(successMessage);

        // Short delay to show success state before redirect
        setTimeout(() => {
          navigate(destination, { replace: true });
        }, 1500);

      } catch (err) {
        console.error('[AuthConfirm] Unexpected error:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    verifyToken();
  }, [tokenHash, type, redirectTo, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'verifying' && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>Verifying your email</CardTitle>
              <CardDescription>Please wait while we confirm your email address...</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle>Email Confirmed!</CardTitle>
              <CardDescription>Redirecting you now...</CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>

        {status === 'error' && (
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => navigate('/auth')} variant="default">
              Back to Login
            </Button>
            <Button onClick={() => navigate('/auth?tab=magic-link')} variant="outline">
              Request New Link
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

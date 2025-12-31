import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

type VerifyStatus = 'verifying' | 'success' | 'error';

export default function MagicLinkVerify() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { verifyMagicLink, isAuthenticated } = useBusinessAuth();
  
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // If already authenticated, redirect
    if (isAuthenticated) {
      navigate('/calendar', { replace: true });
      return;
    }

    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided');
      return;
    }

    const verify = async () => {
      const result = await verifyMagicLink(token);
      
      if (result.error) {
        setStatus('error');
        setErrorMessage(result.error);
      } else {
        setStatus('success');
        // Redirect after a brief delay to show success
        setTimeout(() => {
          navigate('/calendar', { replace: true });
        }, 1500);
      }
    };

    verify();
  }, [token, verifyMagicLink, navigate, isAuthenticated]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {status === 'verifying' && 'Verifying your link...'}
            {status === 'success' && 'Successfully verified!'}
            {status === 'error' && 'Verification failed'}
          </CardTitle>
          <CardDescription>
            {status === 'verifying' && 'Please wait while we sign you in'}
            {status === 'success' && 'Redirecting to your dashboard...'}
            {status === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center py-6">
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  onClick={() => navigate('/auth', { replace: true })}
                  className="w-full"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Request new link
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/', { replace: true })}
                  className="w-full"
                >
                  Go to home
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

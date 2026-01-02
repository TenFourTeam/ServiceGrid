import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

type VerifyStatus = 'verifying' | 'success' | 'error';

export default function MagicLinkVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useBusinessAuth();
  
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) return;

    // Supabase magic links automatically sign in via onAuthStateChange
    // Check if we have an error in the URL params
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || error || 'Verification failed');
      return;
    }

    // If authenticated, redirect to dashboard
    if (isAuthenticated) {
      setStatus('success');
      setTimeout(() => {
        navigate('/calendar', { replace: true });
      }, 1500);
      return;
    }

    // If not authenticated and no error, the link may have expired
    // Give it a moment to process (Supabase handles this automatically)
    const timeout = setTimeout(() => {
      if (!isAuthenticated) {
        setStatus('error');
        setErrorMessage('Link expired or invalid. Please request a new one.');
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isLoading, searchParams, navigate]);

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

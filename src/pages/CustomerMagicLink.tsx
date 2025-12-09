import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CustomerAuthProvider } from '@/components/CustomerPortal/CustomerAuthProvider';

function CustomerMagicLinkContent() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { verifyMagicLink, isAuthenticated } = useCustomerAuth();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid magic link');
      return;
    }

    verifyMagicLink(token).then((result) => {
      if (result.success) {
        setStatus('success');
        // Redirect to portal after short delay
        setTimeout(() => {
          navigate('/portal', { replace: true });
        }, 1500);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Failed to verify magic link');
      }
    });
  }, [token, verifyMagicLink, navigate]);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && status === 'success') {
      navigate('/portal', { replace: true });
    }
  }, [isAuthenticated, status, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {status === 'verifying' && 'Verifying...'}
              {status === 'success' && 'Welcome!'}
              {status === 'error' && 'Link Invalid'}
            </CardTitle>
            <CardDescription>
              {status === 'verifying' && 'Please wait while we verify your magic link'}
              {status === 'success' && 'You have been signed in successfully'}
              {status === 'error' && 'This magic link is invalid or has expired'}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center py-8">
            {status === 'verifying' && (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <p className="text-muted-foreground text-center">
                  Redirecting to your portal...
                </p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-destructive mb-4" />
                <p className="text-muted-foreground text-center mb-6">
                  {errorMessage}
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <Button asChild>
                    <Link to="/customer-login">
                      Request New Magic Link
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Home
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CustomerMagicLink() {
  return (
    <CustomerAuthProvider>
      <CustomerMagicLinkContent />
    </CustomerAuthProvider>
  );
}

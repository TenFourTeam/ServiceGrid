import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, CheckCircle, XCircle } from 'lucide-react';

type ResetStatus = 'form' | 'submitting' | 'success' | 'error';

export default function PasswordReset() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<ResetStatus>('form');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No reset token provided');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setStatus('submitting');

    try {
      const { data, error } = await supabase.functions.invoke('business-auth', {
        method: 'POST',
        body: { action: 'password-reset', token, new_password: password }
      });

      if (error || !data?.success) {
        setStatus('error');
        setErrorMessage(data?.error || error?.message || 'Failed to reset password');
        return;
      }

      setStatus('success');
      toast.success('Password reset successfully');
      
      // Redirect to auth page after a brief delay
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to reset password');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {status === 'form' && 'Reset your password'}
            {status === 'submitting' && 'Resetting password...'}
            {status === 'success' && 'Password reset!'}
            {status === 'error' && 'Reset failed'}
          </CardTitle>
          <CardDescription>
            {status === 'form' && 'Enter your new password below'}
            {status === 'submitting' && 'Please wait...'}
            {status === 'success' && 'Redirecting to sign in...'}
            {status === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Reset Password
              </Button>
            </form>
          )}

          {status === 'submitting' && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-destructive/10 p-3">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <Button 
                onClick={() => navigate('/auth', { replace: true })}
                className="w-full"
              >
                Go to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

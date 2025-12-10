import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { toast } from 'sonner';

interface MagicLinkFormProps {
  onSuccess?: () => void;
  initialEmail?: string;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function MagicLinkForm({ onSuccess, initialEmail }: MagicLinkFormProps) {
  const { sendMagicLink } = useCustomerAuth();
  const [email, setEmail] = useState(initialEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setWarning(null);
    
    const result = await sendMagicLink(email.trim());
    
    setIsLoading(false);

    if (result.success) {
      setSent(true);
      setEmailSent(result.emailSent !== false);
      setWarning(result.warning || null);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      
      if (result.emailSent === false) {
        toast.warning('There was an issue sending the email. You can try again.');
      } else {
        toast.success('Magic link sent! Check your email.');
      }
      onSuccess?.();
    } else {
      toast.error(result.error || 'Failed to send magic link');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    setWarning(null);
    
    const result = await sendMagicLink(email.trim());
    
    setIsLoading(false);

    if (result.success) {
      setEmailSent(result.emailSent !== false);
      setWarning(result.warning || null);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      
      if (result.emailSent !== false) {
        toast.success('Magic link resent! Check your email.');
      } else {
        toast.warning('There was an issue sending the email.');
      }
    } else {
      toast.error(result.error || 'Failed to resend magic link');
    }
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Check your email</h3>
          <p className="text-muted-foreground text-sm">
            We sent a magic link to <strong>{email}</strong>
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Click the link in the email to sign in.
          </p>
        </div>

        {/* Warning if email may not have sent */}
        {!emailSent && (
          <Alert variant="destructive" className="bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {warning || 'There was an issue sending the email. Please try again or use a different sign-in method.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Resend section */}
        <div className="text-center space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email?
          </p>
          <Button 
            variant="outline" 
            onClick={handleResend}
            disabled={isLoading || resendCooldown > 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Magic Link
              </>
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            className="text-sm"
            onClick={() => {
              setSent(false);
              setEmail('');
              setWarning(null);
            }}
          >
            Try a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="magic-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            disabled={isLoading}
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Magic Link
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        We'll email you a link to sign in instantly. No password needed.
      </p>
    </form>
  );
}

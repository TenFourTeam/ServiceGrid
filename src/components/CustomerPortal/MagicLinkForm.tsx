import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { toast } from 'sonner';

interface MagicLinkFormProps {
  onSuccess?: () => void;
}

export function MagicLinkForm({ onSuccess }: MagicLinkFormProps) {
  const { sendMagicLink } = useCustomerAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    
    const result = await sendMagicLink(email.trim());
    
    setIsLoading(false);

    if (result.success) {
      setSent(true);
      toast.success('Magic link sent! Check your email.');
      onSuccess?.();
    } else {
      toast.error(result.error || 'Failed to send magic link');
    }
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Check your email</h3>
        <p className="text-muted-foreground text-sm">
          We sent a magic link to <strong>{email}</strong>
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Click the link in the email to sign in.
        </p>
        <Button 
          variant="ghost" 
          className="mt-4"
          onClick={() => {
            setSent(false);
            setEmail('');
          }}
        >
          Try a different email
        </Button>
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
        We'll email you a link to sign in instantly.
      </p>
    </form>
  );
}

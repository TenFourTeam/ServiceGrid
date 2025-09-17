import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import AppLayout from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, Share, Gift, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ReferralPage() {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  
  const referralLink = `${window.location.origin}/invite/referral?ref=${user?.id || 'user'}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppLayout title="Refer A Friend">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Hero Card */}
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Give a month, get a month free
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Help fellow contractors discover ServiceGrid and you'll both get 1 month free
            </p>
          </CardHeader>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Share className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Share your link</h4>
                <p className="text-sm text-muted-foreground">Send your referral link to contractor friends</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Friend signs up</h4>
                <p className="text-sm text-muted-foreground">They create an account and subscribe to a paid plan</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Gift className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Both get 1 month free</h4>
                <p className="text-sm text-muted-foreground">You both receive a free month on your subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={referralLink} 
                readOnly 
                className="font-mono text-xs"
              />
              <Button 
                onClick={handleCopyLink}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with contractors who could benefit from ServiceGrid
            </p>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-primary">For You</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Get 1 month free when your referral subscribes</li>
                  <li>• Help grow the contractor community</li>
                  <li>• No limit on referrals</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-primary">For Your Friend</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Get 1 month free on their subscription</li>
                  <li>• Access to all ServiceGrid features</li>
                  <li>• Join a community of contractors</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Terms and conditions apply. Free months are applied as credits to active subscriptions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
import { useState } from 'react';
import { X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscriptions } from '@/queries/unified';
import { useNavigate } from 'react-router-dom';

export function SubscriptionBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { status: subscription, isError } = useSubscriptions();
  const navigate = useNavigate();

  // Hide banner if there's an error (e.g., Stripe not configured) or no subscription data
  if (!subscription || subscription.subscribed || dismissed || isError) {
    return null;
  }

  const { isTrialExpired, trialDaysLeft } = subscription;

  const handleUpgrade = () => {
    navigate('/settings');
  };

  if (isTrialExpired) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-destructive">
            Your free trial has expired - Upgrade to continue using all features
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={handleUpgrade}
          >
            <Crown className="h-4 w-4 mr-1" />
            Upgrade Now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-destructive hover:text-destructive/80"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary/50 border-b border-secondary/20 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium">Free Trial</p>
        <Badge variant="secondary">
          {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline"
          onClick={handleUpgrade}
        >
          <Crown className="h-4 w-4 mr-1" />
          Upgrade
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { X, Crown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useOnboardingActions } from '@/onboarding/hooks';

export function TrialBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: subscription } = useSubscriptionStatus();
  const { openSubscription } = useOnboardingActions();

  if (!subscription || subscription.subscribed || dismissed) {
    return null;
  }

  // Calculate trial status from dashboard data
  const endDate = subscription.subscription_end ? new Date(subscription.subscription_end) : null;
  const now = new Date();
  const isTrialExpired = endDate ? now > endDate : false;
  const trialDaysLeft = endDate && !isTrialExpired ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (isTrialExpired) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-medium text-red-900">
              Your free trial has expired
            </p>
            <p className="text-xs text-red-700">
              Upgrade now to continue using all features
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={openSubscription}
          >
            <Crown className="h-4 w-4 mr-1" />
            Upgrade Now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-amber-900">
            Free Trial
          </p>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
            {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline"
          className="border-amber-300 text-amber-800 hover:bg-amber-100"
          onClick={openSubscription}
        >
          <Crown className="h-4 w-4 mr-1" />
          Upgrade
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
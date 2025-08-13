import { useEffect } from 'react';
import { Clock, Crown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useOnboarding } from './OnboardingProvider';

export function TrialNotifications() {
  const { data: subscription } = useSubscriptionStatus();
  const { openSubscription } = useOnboarding();
  const { toast } = useToast();

  useEffect(() => {
    if (!subscription || subscription.subscribed) return;

    const { trialDaysLeft, isTrialExpired } = subscription;

    // Show notifications at key milestones
    if (isTrialExpired) {
      toast({
        title: "Trial Expired",
        description: "Your free trial has ended. Upgrade to continue using all features.",
        variant: "destructive",
        action: (
          <Button 
            size="sm" 
            onClick={openSubscription}
            className="bg-red-600 hover:bg-red-700"
          >
            <Crown className="h-4 w-4 mr-1" />
            Upgrade
          </Button>
        ),
      });
    } else if (trialDaysLeft <= 1) {
      toast({
        title: "Trial Ending Soon",
        description: `Only ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your free trial.`,
        action: (
          <Button 
            size="sm" 
            variant="outline"
            onClick={openSubscription}
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            <Crown className="h-4 w-4 mr-1" />
            Upgrade
          </Button>
        ),
      });
    } else if (trialDaysLeft <= 3) {
      toast({
        title: "Trial Reminder",
        description: `${trialDaysLeft} days left in your free trial.`,
        action: (
          <Button 
            size="sm" 
            variant="outline"
            onClick={openSubscription}
          >
            <Crown className="h-4 w-4 mr-1" />
            Upgrade
          </Button>
        ),
      });
    }
  }, [subscription, openSubscription, toast]);

  return null; // This component only shows toasts
}
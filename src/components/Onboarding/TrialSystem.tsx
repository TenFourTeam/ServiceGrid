import { useState, useEffect, ReactNode } from 'react';
import { X, Crown, Lock, Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useOnboardingActions } from '@/onboarding/hooks';
import { useLocation } from 'react-router-dom';

// Banner Component
export function TrialBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: subscription } = useSubscriptionStatus();
  const { openSubscription } = useOnboardingActions();

  if (!subscription || subscription.subscribed || dismissed) {
    return null;
  }

  const { isTrialExpired, trialDaysLeft } = subscription;

  if (isTrialExpired) {
    return (
      <div className="bg-gradient-to-r from-destructive/10 to-destructive/20 border border-destructive/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-medium text-destructive">
              Your free trial has expired
            </p>
            <p className="text-xs text-destructive/80">
              Upgrade now to continue using all features
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={openSubscription}
          >
            <Crown className="h-4 w-4 mr-1" />
            Upgrade Now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-secondary/50 to-secondary/80 border border-secondary/20 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            Free Trial
          </p>
          <Badge variant="secondary">
            {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline"
          onClick={openSubscription}
        >
          <Crown className="h-4 w-4 mr-1" />
          Upgrade
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="hover:bg-secondary/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Gate Component
interface TrialGateProps {
  children: ReactNode;
  feature: string;
  description?: string;
  fallbackContent?: ReactNode;
}

export function TrialGate({ children, feature, description, fallbackContent }: TrialGateProps) {
  const { data: subscription } = useSubscriptionStatus();
  const { openSubscription } = useOnboardingActions();

  if (!subscription || subscription.subscribed) {
    return <>{children}</>;
  }

  const { isTrialExpired, trialDaysLeft } = subscription;

  if (isTrialExpired) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Trial Expired</CardTitle>
          <CardDescription className="text-destructive/80">
            Your free trial has ended. Upgrade to continue using {feature}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {description && (
            <p className="text-sm text-destructive/70">{description}</p>
          )}
          <div className="space-y-2">
            <Button onClick={openSubscription} className="w-full bg-destructive hover:bg-destructive/90">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
            {fallbackContent && (
              <div className="pt-4 border-t border-destructive/20">
                {fallbackContent}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show premium feature during trial with upgrade prompt
  return (
    <div className="space-y-4">
      <div className="bg-secondary/30 border border-secondary/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Premium Feature</span>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
            {trialDaysLeft} days left
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          You're using {feature} during your free trial. 
          {description && ` ${description}`}
        </p>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={openSubscription}
        >
          <Crown className="h-3 w-3 mr-1" />
          Upgrade to Keep Access
        </Button>
      </div>
      {children}
    </div>
  );
}

// Notifications Component
export function TrialNotifications() {
  const { data: subscription } = useSubscriptionStatus();
  const { openSubscription } = useOnboardingActions();
  const { toast } = useToast();
  const location = useLocation();

  useEffect(() => {
    // Don't show notifications on landing page
    if (location.pathname === '/') return;
    
    if (!subscription || subscription.subscribed) return;

    const { isTrialExpired, trialDaysLeft } = subscription;

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
            className="bg-destructive hover:bg-destructive/90"
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
  }, [subscription, openSubscription, toast, location.pathname]);

  return null; // This component only shows toasts
}

// Subscription Gate Modal Component
interface SubscriptionGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  description: string;
  benefits?: string[];
}

export function SubscriptionGate({ 
  open, 
  onOpenChange, 
  feature, 
  description,
  benefits = [
    'Unlimited quotes and invoices',
    'Customer management',
    'Work order scheduling',
    'Payment processing',
    'Email notifications',
    'Priority support'
  ]
}: SubscriptionGateProps) {
  const { openSubscription } = useOnboardingActions();

  const handleUpgrade = () => {
    onOpenChange(false);
    openSubscription();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Crown className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-lg">Premium Feature</DialogTitle>
              <Badge variant="secondary">
                Upgrade Required
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-secondary/30 border border-secondary/20 rounded-lg">
            <Lock className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">{feature}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-3">Unlock with Premium:</h4>
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-primary to-primary/90"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Trial System Component (combines all functionality)
export function TrialSystem() {
  return (
    <>
      <TrialBanner />
      <TrialNotifications />
    </>
  );
}

// Note: Individual components are available as named functions above
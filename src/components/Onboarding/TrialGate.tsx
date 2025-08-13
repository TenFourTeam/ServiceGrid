import { ReactNode } from 'react';
import { Crown, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useOnboarding } from './OnboardingProvider';

interface TrialGateProps {
  children: ReactNode;
  feature: string;
  description?: string;
  fallbackContent?: ReactNode;
}

export function TrialGate({ children, feature, description, fallbackContent }: TrialGateProps) {
  const { data: subscription } = useSubscriptionStatus();
  const { openSubscription } = useOnboarding();

  if (!subscription || subscription.subscribed) {
    return <>{children}</>;
  }

  if (subscription.isTrialExpired) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Trial Expired</CardTitle>
          <CardDescription className="text-red-700">
            Your free trial has ended. Upgrade to continue using {feature}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {description && (
            <p className="text-sm text-red-600">{description}</p>
          )}
          <div className="space-y-2">
            <Button onClick={openSubscription} className="w-full bg-red-600 hover:bg-red-700">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
            {fallbackContent && (
              <div className="pt-4 border-t border-red-200">
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
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-900">Premium Feature</span>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
            {subscription.trialDaysLeft} days left
          </span>
        </div>
        <p className="text-sm text-amber-700 mb-3">
          You're using {feature} during your free trial. 
          {description && ` ${description}`}
        </p>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={openSubscription}
          className="border-amber-300 text-amber-800 hover:bg-amber-100"
        >
          <Crown className="h-3 w-3 mr-1" />
          Upgrade to Keep Access
        </Button>
      </div>
      {children}
    </div>
  );
}
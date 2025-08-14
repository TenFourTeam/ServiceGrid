import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, User, Users, Calendar, FileText, CreditCard, Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useOnboardingState } from '@/onboarding/streamlined';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useLocation } from 'react-router-dom';

interface FloatingSetupWidgetProps {
  onSetupProfile: () => void;
  onAddCustomer: () => void;
  onCreateJob: () => void;
  onCreateQuote: () => void;
  onLinkBank: () => void;
  onStartSubscription: () => void;
}

export function FloatingSetupWidget({
  onSetupProfile,
  onAddCustomer,
  onCreateJob,
  onCreateQuote,
  onLinkBank,
  onStartSubscription,
}: FloatingSetupWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => 
    localStorage.getItem('setup-widget-dismissed') === 'true'
  );
  const onboardingState = useOnboardingState();
  const { data: subscription } = useSubscriptionStatus();
  const location = useLocation();

  // Hide widget on landing page
  if (location.pathname === '/') {
    return null;
  }

  const { isComplete, completionPercentage } = onboardingState;
  
  // Hide widget if onboarding is complete OR if permanently dismissed
  if (isComplete || isDismissed) {
    return null;
  }

  // Calculate trial status
  const endDate = subscription?.subscription_end ? new Date(subscription.subscription_end) : null;
  const now = new Date();
  const isTrialExpired = endDate ? now > endDate : false;
  const trialDaysLeft = endDate && !isTrialExpired ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  // Show widget if trial is expired and user hasn't subscribed (override dismissal)
  const shouldForceShow = isTrialExpired && !subscription?.subscribed;

  const handleDismiss = () => {
    localStorage.setItem('setup-widget-dismissed', 'true');
    setIsDismissed(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  const progressPct = completionPercentage;
  
  const nextAction = onboardingState.nextAction;
  const isProfileIncomplete = !onboardingState.profileComplete;
  const needsCustomers = !onboardingState.hasCustomers;
  const needsContent = !onboardingState.hasContent;
  const needsBank = !onboardingState.bankLinked;
  const needsSubscription = !onboardingState.subscribed;

  return (
    <div 
      className="fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] transition-transform duration-200 ease-out"
      data-widget="floating-setup"
      style={{
        transform: 'translateY(var(--toast-offset, 0px))'
      }}>
      <Card className="bg-background border shadow-lg animate-pulse-subtle">
        {!isExpanded ? (
          // Collapsed state
          <CardHeader 
            className="cursor-pointer pb-3"
            onClick={() => setIsExpanded(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">
                    {shouldForceShow ? 'Upgrade Required' : 'Setup Progress'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {shouldForceShow 
                      ? 'Trial expired - upgrade to continue' 
                      : `${Math.round(progressPct)}% complete`
                    }
                  </p>
                </div>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
            {!shouldForceShow && (
              <Progress value={progressPct} className="h-1.5 mt-2" />
            )}
          </CardHeader>
        ) : (
          // Expanded state
          <>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {shouldForceShow ? 'Trial Expired' : 'Setup Your Account'}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {!shouldForceShow && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Hide widget"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCollapse}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              {shouldForceShow ? (
                <div className="text-center space-y-3">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <Crown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm text-red-900 font-medium">Your trial has expired</p>
                    <p className="text-xs text-red-700 mt-1">
                      Upgrade now to continue using all features
                    </p>
                  </div>
                  <Button onClick={onStartSubscription} className="w-full bg-red-600 hover:bg-red-700">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(progressPct)}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />

                  {/* Next Action */}
                  {nextAction && (
                    <div className="p-3 bg-primary/5 border border-primary/30 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span className="text-primary font-medium">Next: {nextAction}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {isProfileIncomplete && (
                          <Button size="sm" variant="outline" onClick={onSetupProfile} className="border-primary text-primary">
                            Complete Profile
                          </Button>
                        )}
                        {!isProfileIncomplete && needsCustomers && (
                          <Button size="sm" variant="outline" onClick={onAddCustomer} className="border-primary text-primary">
                            Add Customer
                          </Button>
                        )}
                        {!isProfileIncomplete && !needsCustomers && needsContent && (
                          <Button size="sm" variant="outline" onClick={onCreateJob} className="border-primary text-primary">
                            Create Job
                          </Button>
                        )}
                        {!isProfileIncomplete && !needsCustomers && !needsContent && needsBank && (
                          <Button size="sm" variant="outline" onClick={onLinkBank} className="border-primary text-primary">
                            Link Bank
                          </Button>
                        )}
                        {!isProfileIncomplete && !needsCustomers && !needsContent && !needsBank && needsSubscription && (
                          <Button size="sm" variant="outline" onClick={onStartSubscription} className="border-primary text-primary">
                            Subscribe
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Trial warning for active trial */}
                  {subscription && !subscription.subscribed && !isTrialExpired && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Crown className="h-4 w-4 text-amber-600" />
                        <span className="text-amber-900 font-medium">
                          {trialDaysLeft} trial days left
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onStartSubscription}
                        className="w-full mt-2 border-amber-300 text-amber-800 hover:bg-amber-100"
                      >
                        Upgrade Early
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
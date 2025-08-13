import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronUp, ChevronDown, User, Users, Calendar, CreditCard, Crown } from 'lucide-react';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { cn } from '@/lib/utils';

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
  onStartSubscription
}: FloatingSetupWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    hasNameAndBusiness,
    hasCustomers,
    hasJobs,
    hasQuotes,
    bankLinked,
    subscribed,
    completionPercentage,
    isComplete
  } = useOnboardingState();

  // Don't show if everything is complete
  if (isComplete) return null;

  const steps = [
    {
      id: 'profile',
      label: 'Set up your profile',
      completed: hasNameAndBusiness,
      icon: User,
      action: onSetupProfile
    },
    {
      id: 'customer',
      label: 'Create first Customer',
      completed: hasCustomers,
      icon: Users,
      action: onAddCustomer
    },
    {
      id: 'work',
      label: 'Create first Job or Quote',
      completed: hasJobs || hasQuotes,
      icon: Calendar,
      action: hasJobs ? onCreateQuote : onCreateJob
    },
    {
      id: 'bank',
      label: 'Link bank account',
      completed: bankLinked,
      icon: CreditCard,
      action: onLinkBank
    },
    {
      id: 'subscription',
      label: 'Start subscription',
      completed: subscribed,
      icon: Crown,
      action: onStartSubscription,
      trialDays: 7 // TODO: Calculate actual trial days remaining
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;

  return (
    <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
      <Card 
        className={cn(
          "shadow-lg transition-all duration-300 ease-standard",
          expanded ? "w-80" : "w-auto",
          !expanded && completionPercentage < 100 && "attention-ring"
        )}
      >
        {!expanded ? (
          // Collapsed state
          <CardContent className="p-3 md:p-4">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 w-full"
              onClick={() => setExpanded(true)}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {completedCount}/5
                </span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium truncate">Setup Progress</div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(completionPercentage)}% complete
                </div>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CardContent>
        ) : (
          // Expanded state
          <>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Setup Progress</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setExpanded(false)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <Progress value={completionPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(completionPercentage)}% complete ({completedCount}/5 steps)
                </p>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border",
                      step.completed 
                        ? "bg-success/10 border-success/20 dark:bg-success/5 dark:border-success/20" 
                        : "bg-background hover:bg-muted/50 border-muted"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      step.completed 
                        ? "bg-success text-success-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {step.completed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        step.completed ? "text-success-foreground" : "text-foreground"
                      )}>
                        {step.label}
                      </p>
                      {step.id === 'subscription' && step.trialDays && !step.completed && (
                        <p className="text-xs text-muted-foreground">
                          {step.trialDays} days left in trial
                        </p>
                      )}
                    </div>

                    {!step.completed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={step.action}
                      >
                        Start
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
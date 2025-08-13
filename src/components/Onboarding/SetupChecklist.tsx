import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronRight, X, Users, Calendar, CreditCard, Crown, User } from 'lucide-react';
import { useState } from 'react';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { cn } from '@/lib/utils';

interface SetupChecklistProps {
  onSetupProfile: () => void;
  onAddCustomer: () => void;
  onCreateJob: () => void;
  onCreateQuote: () => void;
  onLinkBank: () => void;
  onStartSubscription: () => void;
}

export function SetupChecklist({
  onSetupProfile,
  onAddCustomer,
  onCreateJob,
  onCreateQuote,
  onLinkBank,
  onStartSubscription
}: SetupChecklistProps) {
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <Card className="w-80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Setup Progress</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
        
        {!collapsed && (
          <div className="space-y-2">
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(completionPercentage)}% complete
            </p>
          </div>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border",
                  step.completed 
                    ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                    : "bg-background hover:bg-muted/50 border-muted"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  step.completed 
                    ? "bg-green-500 text-white" 
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
                    step.completed ? "text-green-700 dark:text-green-300" : "text-foreground"
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
      )}
    </Card>
  );
}
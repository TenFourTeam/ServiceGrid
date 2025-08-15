import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronRight, X, Users, Calendar, CreditCard, Crown, User, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingState } from '@/onboarding/streamlined';
import { cn } from '@/lib/utils';

interface SetupChecklistProps {
  // No props needed - we'll handle navigation internally
}

export function SetupChecklist({}: SetupChecklistProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const onboarding = useOnboardingState();

  // Don't show if everything is complete
  if (onboarding.isComplete) return null;

  // Map onboarding state to step completion and actions
  const stepConfigs = [
    { 
      id: 'profile', 
      title: 'Complete Profile', 
      complete: onboarding.profileComplete,
      action: () => navigate('/settings', { state: { focus: 'profile' } }),
      icon: User 
    },
    { 
      id: 'customers', 
      title: 'Add Customers', 
      complete: onboarding.hasCustomers,
      action: () => navigate('/customers', { state: { focus: 'add-customer' } }),
      icon: Users 
    },
    { 
      id: 'content', 
      title: 'Create Content', 
      complete: onboarding.hasContent,
      action: () => navigate('/calendar', { state: { focus: 'new-job' } }),
      icon: Calendar 
    },
    { 
      id: 'bank', 
      title: 'Link Bank Account', 
      complete: onboarding.bankLinked,
      action: () => navigate('/settings', { state: { focus: 'bank' } }),
      icon: CreditCard 
    },
    { 
      id: 'subscription', 
      title: 'Activate Subscription', 
      complete: onboarding.subscribed,
      action: () => navigate('/settings', { state: { focus: 'subscription' } }),
      icon: Crown 
    },
  ];

  const progressPct = onboarding.completionPercentage;


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
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progressPct}% complete
            </p>
          </div>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 space-y-3">
          {stepConfigs.map((step, index) => {
            const isActive = !step.complete && (index === 0 || stepConfigs[index - 1].complete);
            const isPending = !step.complete && !isActive;
            const Icon = step.icon;
            
            return (
              <button
                key={step.id}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left transition flex items-center gap-3",
                  step.complete && "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800",
                  isActive && "bg-primary/5 border-primary/30 ring-2 ring-primary/40 animate-pulse",
                  isPending && "bg-muted border-border text-muted-foreground cursor-not-allowed"
                )}
                onClick={() => {
                  if (step.complete || isActive) {
                    step.action();
                  }
                }}
                disabled={isPending}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  step.complete && "bg-green-500 text-white",
                  isActive && "bg-primary text-primary-foreground",
                  isPending && "bg-muted text-muted-foreground"
                )}>
                  {step.complete ? (
                    <Check className="h-4 w-4" />
                  ) : isActive ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                </div>
                {isActive && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Start
                  </span>
                )}
              </button>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

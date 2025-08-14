import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronRight, X, Users, Calendar, CreditCard, Crown, User, Sparkles, CircleDashed, Lock } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingState } from '@/onboarding/useOnboardingState';
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
  const navigate = useNavigate();
  const { steps, stepOrder, statuses, currentStepId, progressPct, allComplete } = useOnboardingState();

  // Don't show if everything is complete
  if (allComplete) return null;

  const stepActions = {
    profile: onSetupProfile,
    customers: onAddCustomer,
    content: () => {
      // Navigate to calendar for job creation as default
      navigate('/calendar');
    },
    bank: onLinkBank,
    subscription: onStartSubscription
  };

  const stepIcons = {
    profile: User,
    customers: Users,
    content: Calendar,
    bank: CreditCard,
    subscription: Crown
  };

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
          {stepOrder.map((id) => {
            const step = steps[id];
            const status = statuses[id];
            const isClickable = status === 'active' || status === 'complete';
            const Icon = stepIcons[id];
            
            return (
              <button
                key={id}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left transition flex items-center gap-3",
                  status === 'complete' && "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800",
                  status === 'active' && "bg-primary/5 border-primary/30 ring-2 ring-primary/40 animate-pulse",
                  status === 'pending' && "bg-muted border-border text-muted-foreground cursor-not-allowed",
                  status === 'locked' && "bg-muted/50 border-border text-muted-foreground cursor-not-allowed"
                )}
                onClick={() => {
                  if (!isClickable) return;
                  
                  if (status === 'complete') {
                    // Navigate to completed step
                    navigate(step.route, { state: step.focus ? { focus: step.focus } : undefined });
                  } else {
                    // Execute action for active step
                    stepActions[id]?.();
                  }
                }}
                disabled={!isClickable}
              >
                <StepIcon status={status} icon={Icon} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                </div>
                {status === 'active' && (
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

function StepIcon({ status, icon: Icon }: { status: 'complete' | 'active' | 'pending' | 'locked'; icon: any }) {
  const iconClass = "h-4 w-4";
  
  if (status === 'complete') {
    return (
      <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center">
        <Check className={iconClass} />
      </div>
    );
  }
  
  if (status === 'active') {
    return (
      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
        <Sparkles className={iconClass} />
      </div>
    );
  }
  
  if (status === 'pending') {
    return (
      <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
        <Icon className={iconClass} />
      </div>
    );
  }
  
  return (
    <div className="h-8 w-8 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center">
      <Lock className={iconClass} />
    </div>
  );
}
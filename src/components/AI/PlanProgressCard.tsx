import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Circle,
  ListChecks,
  RotateCcw,
  SkipForward,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export interface PlanStepProgress {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back' | 'skipped';
  result?: any;
  error?: string;
}

export interface PlanProgressData {
  planId: string;
  planName: string;
  steps: PlanStepProgress[];
  currentStepIndex: number;
  status: 'executing' | 'completed' | 'failed' | 'rolled_back' | 'cancelled';
  summary?: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    skippedSteps: number;
    rolledBackSteps: number;
    durationMs?: number;
  };
}

interface PlanProgressCardProps {
  progress: PlanProgressData;
}

function getStepIcon(status: PlanStepProgress['status'], isAnimating: boolean) {
  switch (status) {
    case 'completed':
      return (
        <CheckCircle2 
          className={cn(
            "w-4 h-4 text-success",
            isAnimating && "animate-check-pop"
          )} 
        />
      );
    case 'running':
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-destructive" />;
    case 'rolled_back':
      return <RotateCcw className="w-4 h-4 text-amber-500" />;
    case 'skipped':
      return <SkipForward className="w-4 h-4 text-muted-foreground" />;
    default:
      return <Circle className="w-4 h-4 text-muted-foreground/50" />;
  }
}

function getStatusBadge(status: PlanProgressData['status']) {
  switch (status) {
    case 'executing':
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Executing</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Completed</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Failed</Badge>;
    case 'rolled_back':
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Rolled Back</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Cancelled</Badge>;
    default:
      return null;
  }
}

// Confetti particle component for celebration
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-confetti-burst"
      style={{
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 50}%`,
      }}
    />
  );
}

export function PlanProgressCard({ progress }: PlanProgressCardProps) {
  const [recentlyCompletedSteps, setRecentlyCompletedSteps] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  
  const completedSteps = progress.steps.filter(s => s.status === 'completed').length;
  const progressPercent = (completedSteps / progress.steps.length) * 100;
  const isComplete = progress.status === 'completed' || progress.status === 'failed' || progress.status === 'rolled_back';
  const isSuccess = progress.status === 'completed';

  // Track recently completed steps for animation
  useEffect(() => {
    const newCompleted = new Set<string>();
    progress.steps.forEach(step => {
      if (step.status === 'completed' && !recentlyCompletedSteps.has(step.id)) {
        newCompleted.add(step.id);
      }
    });
    
    if (newCompleted.size > 0) {
      setRecentlyCompletedSteps(prev => new Set([...prev, ...newCompleted]));
      
      // Clear animation state after animation completes
      setTimeout(() => {
        setRecentlyCompletedSteps(prev => {
          const updated = new Set(prev);
          newCompleted.forEach(id => updated.delete(id));
          return updated;
        });
      }, 500);
    }
  }, [progress.steps]);

  // Trigger celebration animation on success
  useEffect(() => {
    if (isSuccess && !showCelebration) {
      setShowCelebration(true);
      // Reset after animation
      setTimeout(() => setShowCelebration(false), 2000);
    }
  }, [isSuccess]);

  const confettiColors = ['hsl(var(--success))', 'hsl(var(--primary))', '#FFD700', '#FF6B6B', '#4ECDC4'];

  return (
    <Card className={cn(
      "border-primary/20 transition-all duration-300 relative overflow-hidden",
      progress.status === 'completed' && "border-success/30 bg-gradient-to-br from-success/5 to-transparent",
      progress.status === 'completed' && showCelebration && "animate-celebrate-pulse",
      progress.status === 'failed' && "border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent animate-shake-error",
      progress.status === 'rolled_back' && "border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent"
    )}>
      {/* Confetti overlay for success */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiColors.map((color, i) => (
            <ConfettiParticle key={i} delay={i * 100} color={color} />
          ))}
          {confettiColors.map((color, i) => (
            <ConfettiParticle key={i + 5} delay={i * 100 + 50} color={color} />
          ))}
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg transition-all duration-300",
              progress.status === 'executing' && "bg-primary/10",
              progress.status === 'completed' && "bg-success/10",
              progress.status === 'failed' && "bg-destructive/10",
              progress.status === 'rolled_back' && "bg-amber-500/10"
            )}>
              {progress.status === 'executing' ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : progress.status === 'completed' ? (
                <div className="relative">
                  <CheckCircle2 className={cn(
                    "w-4 h-4 text-success",
                    showCelebration && "animate-check-pop"
                  )} />
                  {showCelebration && (
                    <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-400 animate-pulse" />
                  )}
                </div>
              ) : progress.status === 'failed' ? (
                <XCircle className="w-4 h-4 text-destructive" />
              ) : (
                <ListChecks className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{progress.planName}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isComplete 
                  ? `${completedSteps} of ${progress.steps.length} steps completed`
                  : `Step ${Math.min(progress.currentStepIndex + 1, progress.steps.length)} of ${progress.steps.length}`
                }
              </p>
            </div>
          </div>
          {getStatusBadge(progress.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <Progress 
            value={progressPercent} 
            className={cn(
              "h-2 transition-all duration-500",
              progress.status === 'failed' && "[&>div]:bg-destructive",
              progress.status === 'completed' && "[&>div]:bg-success"
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedSteps} completed</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-1">
          {progress.steps.map((step, index) => {
            const isRecentlyCompleted = recentlyCompletedSteps.has(step.id);
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300",
                  step.status === 'running' && "bg-primary/10 border border-primary/20",
                  step.status === 'completed' && "bg-success/5",
                  step.status === 'completed' && isRecentlyCompleted && "animate-step-success",
                  step.status === 'failed' && "bg-destructive/10 border border-destructive/20",
                  step.status === 'rolled_back' && "bg-amber-500/10",
                  step.status === 'pending' && "opacity-50"
                )}
              >
                {getStepIcon(step.status, isRecentlyCompleted)}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate transition-colors duration-300",
                    step.status === 'running' && "text-primary",
                    step.status === 'completed' && "text-success",
                    step.status === 'failed' && "text-destructive"
                  )}>
                    {step.name}
                  </p>
                  {step.error && (
                    <p className="text-xs text-destructive truncate">
                      {step.error}
                    </p>
                  )}
                </div>
                {step.status === 'running' && (
                  <span className="text-xs text-primary animate-pulse">Running...</span>
                )}
                {step.status === 'completed' && isRecentlyCompleted && (
                  <span className="text-xs text-success animate-fade-in">Done!</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary (when complete) */}
        {isComplete && progress.summary && (
          <div className={cn(
            "pt-2 border-t border-border/50 transition-all duration-500",
            isSuccess && "animate-fade-in"
          )}>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {progress.summary.successfulSteps} succeeded
                </span>
                {progress.summary.failedSteps > 0 && (
                  <span className="text-destructive flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {progress.summary.failedSteps} failed
                  </span>
                )}
                {progress.summary.rolledBackSteps > 0 && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" />
                    {progress.summary.rolledBackSteps} rolled back
                  </span>
                )}
              </div>
              {progress.summary.durationMs && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{(progress.summary.durationMs / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>
            
            {/* Success message */}
            {isSuccess && (
              <p className="text-sm text-success mt-2 flex items-center gap-1.5 animate-fade-in">
                <Sparkles className="w-4 h-4" />
                All steps completed successfully!
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

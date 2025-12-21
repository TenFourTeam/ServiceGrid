import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  AlertTriangle,
  Timer,
  Code2,
  X,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

export interface PlanStepProgress {
  id: string;
  name: string;
  tool?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back' | 'skipped';
  result?: any;
  error?: string;
}

export interface RecoveryActionData {
  id: string;
  label: string;
  description: string;
  navigateTo?: string;
  isConversational?: boolean;
}

export interface EntitySelectionOption {
  id: string;
  label: string;
  value: string;
  metadata?: any;
}

export interface EntitySelectionData {
  question: string;
  resolvesEntity: string;
  options: EntitySelectionOption[];
}

export interface PlanProgressData {
  planId: string;
  planName: string;
  steps: PlanStepProgress[];
  currentStepIndex: number;
  status: 'executing' | 'completed' | 'failed' | 'rolled_back' | 'cancelled' | 'awaiting_recovery';
  startedAt?: string;
  pausedAtStep?: number;
  recoveryActions?: RecoveryActionData[];
  canResume?: boolean;
  entitySelection?: EntitySelectionData;
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
  onCancel?: () => void;
  onRecoveryAction?: (actionId: string, planId: string, navigateTo?: string) => void;
  onResume?: (planId: string) => void;
  onEntitySelect?: (planId: string, entityType: string, entityValue: string) => void;
}

// Elapsed time hook for live timer
function useElapsedTime(isRunning: boolean, startTime?: string) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  
  useEffect(() => {
    if (startTime) {
      startRef.current = new Date(startTime).getTime();
    } else {
      startRef.current = Date.now();
    }
    setElapsed(0);
  }, [startTime]);
  
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRunning]);
  
  return elapsed;
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${seconds}.${tenths}s`;
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
      return <XCircle className="w-4 h-4 text-amber-500" />;
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
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Incomplete</Badge>;
    case 'awaiting_recovery':
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Needs Action</Badge>;
    case 'rolled_back':
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Rolled Back</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Cancelled</Badge>;
    default:
      return null;
  }
}

// Confetti particle component for celebration
function ConfettiParticle({ delay, color, index }: { delay: number; color: string; index: number }) {
  const startX = 20 + (index * 15) % 60; // Spread particles horizontally
  const rotation = index * 45;
  
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-confetti-fall"
      style={{
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        left: `${startX}%`,
        top: '-10px',
        transform: `rotate(${rotation}deg)`,
      }}
    />
  );
}

export function PlanProgressCard({ progress, onCancel, onRecoveryAction, onResume, onEntitySelect }: PlanProgressCardProps) {
  const [recentlyCompletedSteps, setRecentlyCompletedSteps] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [showToolNames, setShowToolNames] = useState(false);
  
  const completedSteps = progress.steps.filter(s => s.status === 'completed').length;
  const progressPercent = (completedSteps / progress.steps.length) * 100;
  const isComplete = progress.status === 'completed' || progress.status === 'failed' || progress.status === 'rolled_back' || progress.status === 'cancelled' || progress.status === 'awaiting_recovery';
  const isSuccess = progress.status === 'completed';
  const isExecuting = progress.status === 'executing';
  const isAwaitingRecovery = progress.status === 'awaiting_recovery' || (progress.status === 'failed' && progress.canResume);
  
  // Live elapsed time during execution
  const elapsedMs = useElapsedTime(isExecuting, progress.startedAt);
  
  // Find the first failed step with an error
  const failedStep = progress.steps.find(s => s.status === 'failed' && s.error);

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
      setTimeout(() => setShowCelebration(false), 2500);
    }
  }, [isSuccess]);

  const confettiColors = ['hsl(var(--success))', 'hsl(var(--primary))', '#FFD700', '#FF6B6B', '#4ECDC4'];

  return (
    <Card className={cn(
      "border-primary/20 transition-all duration-300 relative overflow-hidden",
      progress.status === 'completed' && "border-success/30 bg-gradient-to-br from-success/5 to-transparent",
      progress.status === 'completed' && showCelebration && "animate-celebrate-pulse",
      progress.status === 'failed' && "border-amber-500/20",
      progress.status === 'rolled_back' && "border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent"
    )}>
      {/* Confetti overlay for success */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiColors.map((color, i) => (
            <ConfettiParticle key={`a-${i}`} delay={i * 80} color={color} index={i} />
          ))}
          {confettiColors.map((color, i) => (
            <ConfettiParticle key={`b-${i}`} delay={i * 80 + 200} color={color} index={i + 5} />
          ))}
          {confettiColors.map((color, i) => (
            <ConfettiParticle key={`c-${i}`} delay={i * 80 + 400} color={color} index={i + 10} />
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
              progress.status === 'failed' && "bg-amber-500/10",
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
                <AlertTriangle className="w-4 h-4 text-amber-500" />
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
          <div className="flex items-center gap-2">
            {getStatusBadge(progress.status)}
            {/* Cancel button during execution */}
            {isExecuting && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar with glow effect during execution */}
        <div className="space-y-1.5">
        <Progress 
            value={progressPercent} 
            className={cn(
              "h-2 transition-all duration-500",
              (progress.status === 'failed' || isAwaitingRecovery) && "[&>div]:bg-amber-500",
              progress.status === 'completed' && "[&>div]:bg-success",
              isExecuting && "animate-glow-pulse"
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedSteps} completed</span>
            <div className="flex items-center gap-2">
              {isExecuting && (
                <span className="flex items-center gap-1 text-primary">
                  <Timer className="w-3 h-3 animate-pulse" />
                  {formatElapsed(elapsedMs)}
                </span>
              )}
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </div>

        {/* Error banner for failed plans or awaiting recovery */}
        {(progress.status === 'failed' || isAwaitingRecovery) && failedStep && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {failedStep.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 break-words">
                {failedStep.error}
              </p>
            </div>
          </div>
        )}

        {/* Recovery Actions - show when plan failed with available actions */}
        {isAwaitingRecovery && progress.recoveryActions && progress.recoveryActions.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border animate-fade-in">
            <p className="text-sm text-muted-foreground">
              Fix this and continue:
            </p>
            <div className="flex flex-wrap gap-2">
              {progress.recoveryActions.map(action => (
                <Button
                  key={action.id}
                  size="sm"
                  variant="outline"
                  onClick={() => onRecoveryAction?.(action.id, progress.planId, action.navigateTo)}
                  className="gap-1.5"
                >
                  {action.navigateTo ? (
                    <ExternalLink className="w-3.5 h-3.5" />
                  ) : (
                    <PlayCircle className="w-3.5 h-3.5" />
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
            {progress.canResume && (
              <Button
                size="sm"
                onClick={() => onResume?.(progress.planId)}
                className="gap-1.5 mt-2"
              >
                <PlayCircle className="w-4 h-4" />
                Resume Plan
              </Button>
            )}
          </div>
        )}

        {/* Tool visibility toggle */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 gap-1 text-xs",
              showToolNames && "text-primary"
            )}
            onClick={() => setShowToolNames(!showToolNames)}
          >
            <Code2 className="w-3 h-3" />
            {showToolNames ? 'Hide' : 'Show'} tools
          </Button>
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
                  step.status === 'failed' && "bg-muted/30",
                  step.status === 'rolled_back' && "bg-amber-500/10",
                  step.status === 'pending' && "opacity-50"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {getStepIcon(step.status, isRecentlyCompleted)}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate transition-colors duration-300",
                    step.status === 'running' && "text-primary",
                    step.status === 'completed' && "text-success",
                    step.status === 'failed' && "text-amber-600"
                  )}>
                    {step.name}
                  </p>
                  {showToolNames && step.tool && (
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {step.tool}
                    </p>
                  )}
                  {step.error && (
                    <p className="text-xs text-muted-foreground truncate">
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
                  <span className="text-amber-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {progress.summary.failedSteps} incomplete
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
            
            {/* Failure message - removed redundant text, error banner above is sufficient */}
            
            {/* Cancelled message */}
            {progress.status === 'cancelled' && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5 animate-fade-in">
                <X className="w-4 h-4" />
                Plan execution was cancelled.
              </p>
            )}
            
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
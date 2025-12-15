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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

function getStepIcon(status: PlanStepProgress['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
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
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Executing</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
    case 'rolled_back':
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Rolled Back</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Cancelled</Badge>;
    default:
      return null;
  }
}

export function PlanProgressCard({ progress }: PlanProgressCardProps) {
  const completedSteps = progress.steps.filter(s => s.status === 'completed').length;
  const progressPercent = (completedSteps / progress.steps.length) * 100;
  const isComplete = progress.status === 'completed' || progress.status === 'failed' || progress.status === 'rolled_back';

  return (
    <Card className={cn(
      "border-primary/20",
      progress.status === 'completed' && "border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent",
      progress.status === 'failed' && "border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent",
      progress.status === 'rolled_back' && "border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              progress.status === 'executing' && "bg-blue-500/10",
              progress.status === 'completed' && "bg-green-500/10",
              progress.status === 'failed' && "bg-red-500/10",
              progress.status === 'rolled_back' && "bg-amber-500/10"
            )}>
              {progress.status === 'executing' ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : progress.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : progress.status === 'failed' ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <ListChecks className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{progress.planName}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Step {Math.min(progress.currentStepIndex + 1, progress.steps.length)} of {progress.steps.length}
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
              "h-2",
              progress.status === 'failed' && "[&>div]:bg-red-500",
              progress.status === 'completed' && "[&>div]:bg-green-500"
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedSteps} completed</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-1">
          {progress.steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                step.status === 'running' && "bg-blue-500/10 border border-blue-500/20",
                step.status === 'completed' && "bg-green-500/5",
                step.status === 'failed' && "bg-red-500/10 border border-red-500/20",
                step.status === 'rolled_back' && "bg-amber-500/10",
                step.status === 'pending' && "opacity-50"
              )}
            >
              {getStepIcon(step.status)}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  step.status === 'running' && "text-blue-600 dark:text-blue-400",
                  step.status === 'failed' && "text-red-600 dark:text-red-400"
                )}>
                  {step.name}
                </p>
                {step.error && (
                  <p className="text-xs text-red-600 dark:text-red-400 truncate">
                    {step.error}
                  </p>
                )}
              </div>
              {step.status === 'running' && (
                <span className="text-xs text-blue-500 animate-pulse">Running...</span>
              )}
            </div>
          ))}
        </div>

        {/* Summary (when complete) */}
        {isComplete && progress.summary && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-green-600">
                  ✓ {progress.summary.successfulSteps} succeeded
                </span>
                {progress.summary.failedSteps > 0 && (
                  <span className="text-red-600">
                    ✗ {progress.summary.failedSteps} failed
                  </span>
                )}
                {progress.summary.rolledBackSteps > 0 && (
                  <span className="text-amber-600">
                    ↺ {progress.summary.rolledBackSteps} rolled back
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

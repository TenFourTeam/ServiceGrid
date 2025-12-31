import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, ClipboardList } from 'lucide-react';
import { useRequestAssessmentJob, useAssessmentProgress } from '@/hooks/useAssessmentProgress';

interface AssessmentProgressBadgeProps {
  requestId: string;
  compact?: boolean;
}

export function AssessmentProgressBadge({ requestId, compact = false }: AssessmentProgressBadgeProps) {
  const { data: assessmentJob, isLoading: jobLoading } = useRequestAssessmentJob(requestId);
  const { data: progress, isLoading: progressLoading } = useAssessmentProgress(assessmentJob?.id);

  // No assessment job linked
  if (!jobLoading && !assessmentJob) {
    return null;
  }

  // Loading state
  if (jobLoading || progressLoading) {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && <span>Loading...</span>}
      </Badge>
    );
  }

  if (!progress) {
    return null;
  }

  const isComplete = progress.checklistProgress === 100 && progress.beforePhotoCount > 0;

  if (compact) {
    return (
      <Badge 
        variant={isComplete ? "default" : "secondary"} 
        className={`gap-1 text-xs ${isComplete ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : ''}`}
      >
        {isComplete ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <ClipboardList className="h-3 w-3" />
        )}
        {progress.checklistProgress}%
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isComplete ? "default" : "secondary"} 
        className={`gap-1 text-xs ${isComplete ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : ''}`}
      >
        {isComplete ? (
          <>
            <CheckCircle2 className="h-3 w-3" />
            Assessment Complete
          </>
        ) : (
          <>
            <ClipboardList className="h-3 w-3" />
            Assessment: {progress.checklistProgress}%
          </>
        )}
      </Badge>
      {!isComplete && (
        <Progress value={progress.checklistProgress} className="h-1 w-16" />
      )}
    </div>
  );
}

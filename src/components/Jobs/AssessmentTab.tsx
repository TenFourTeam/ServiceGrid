import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  Camera, 
  AlertTriangle, 
  Lightbulb, 
  FileText, 
  Sparkles,
  ClipboardList 
} from 'lucide-react';
import { useAssessmentProgress } from '@/hooks/useAssessmentProgress';
import { Skeleton } from '@/components/ui/skeleton';

interface AssessmentTabProps {
  jobId: string;
  onGenerateReport?: () => void;
  onCreateQuote?: () => void;
}

export function AssessmentTab({ jobId, onGenerateReport, onCreateQuote }: AssessmentTabProps) {
  const { data: progress, isLoading } = useAssessmentProgress(jobId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Unable to load assessment progress
      </div>
    );
  }

  const isComplete = progress.checklistProgress === 100 && progress.beforePhotoCount > 0;

  return (
    <div className="space-y-4 py-4">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Assessment Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Checklist Completion</span>
              <span className="text-muted-foreground">
                {progress.completedChecklistItems}/{progress.totalChecklistItems} items
              </span>
            </div>
            <Progress value={progress.checklistProgress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span>{progress.beforePhotoCount} before photos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>{progress.photoCount} total media</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk & Opportunities Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {progress.risksFound} Risks
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                <Lightbulb className="h-3 w-3" />
                {progress.opportunitiesFound} Opportunities
              </Badge>
            </div>
          </div>

          {progress.risksFound === 0 && progress.opportunitiesFound === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              No risks or opportunities flagged yet. Tag photos with risk or opportunity labels during inspection.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Report Status & Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Assessment Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {progress.hasReport ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">Report generated</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isComplete 
                ? 'Ready to generate assessment report' 
                : 'Complete the checklist and add before photos to generate a report'}
            </p>
          )}

          <div className="flex gap-2">
            {onGenerateReport && (
              <Button 
                onClick={onGenerateReport}
                variant={progress.hasReport ? "outline" : "default"}
                size="sm"
                className="gap-2"
                disabled={!isComplete && !progress.hasReport}
              >
                <Sparkles className="h-4 w-4" />
                {progress.hasReport ? 'Regenerate Report' : 'Generate Report'}
              </Button>
            )}
            
            {onCreateQuote && (
              <Button
                onClick={onCreateQuote}
                variant="outline"
                size="sm"
                disabled={!progress.hasReport}
              >
                Create Quote
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

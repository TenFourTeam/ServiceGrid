import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, User, MapPin, Clock, TrendingUp, ChevronDown, Loader2, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScheduledJobPreview {
  jobId: string;
  title: string;
  customerName?: string;
  startTime: string;
  endTime: string;
  assignedTo?: string;
  assignedToName?: string;
  reasoning: string;
  priorityScore: number;
  travelTimeMinutes?: number;
  alternatives?: Array<{
    startTime: string;
    endTime: string;
    reason: string;
  }>;
}

interface SchedulePreviewCardProps {
  scheduledJobs: ScheduledJobPreview[];
  totalJobsRequested: number;
  estimatedTimeSaved?: number;
  onApprove: () => Promise<void>;
  onReject: () => void;
  onViewCalendar?: (date: string) => void;
}

export function SchedulePreviewCard({
  scheduledJobs,
  totalJobsRequested,
  estimatedTimeSaved,
  onApprove,
  onReject,
  onViewCalendar,
}: SchedulePreviewCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const isMobile = useIsMobile();

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  };

  const avgConfidence = scheduledJobs.length > 0
    ? Math.round((scheduledJobs.reduce((sum, job) => sum + job.priorityScore, 0) / scheduledJobs.length) * 100)
    : 0;

  // Group jobs by date
  const jobsByDate = scheduledJobs.reduce((acc, job) => {
    const date = format(new Date(job.startTime), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(job);
    return acc;
  }, {} as Record<string, ScheduledJobPreview[]>);

  const firstDate = Object.keys(jobsByDate)[0];

  return (
    <Card className="my-4 border-2 border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Proposed Schedule
        </CardTitle>
        <CardDescription className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {scheduledJobs.length} of {totalJobsRequested} jobs scheduled
          </span>
          {estimatedTimeSaved && estimatedTimeSaved > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Saves ~{estimatedTimeSaved} hours
            </span>
          )}
          <Badge variant="outline" className="gap-1">
            {avgConfidence}% confidence
          </Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isMobile ? (
          // Mobile: Compact collapsible view
          <div className="space-y-2">
            {Object.entries(jobsByDate).map(([date, jobs]) => (
              <div key={date} className="space-y-2">
                <div className="text-sm font-semibold text-muted-foreground px-1">
                  {format(new Date(date), 'EEEE, MMM d')}
                </div>
                {jobs.map((job, idx) => (
                  <Collapsible key={job.jobId}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-start justify-between gap-2 p-3 bg-muted/50 rounded-lg text-left hover:bg-muted/70 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{job.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(job.startTime), 'h:mm a')} - {format(new Date(job.endTime), 'h:mm a')}
                          </div>
                          {job.assignedToName && (
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {job.assignedToName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(job.priorityScore * 100)}%
                          </Badge>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 py-2 text-xs text-muted-foreground bg-background/50 rounded-b-lg border-x border-b border-muted">
                        💡 {job.reasoning}
                      </div>
                    </CollapsibleContent>
                    {idx < jobs.length - 1 && job.travelTimeMinutes && job.travelTimeMinutes > 0 && (
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground py-2">
                        <Navigation className="w-3 h-3" />
                        {job.travelTimeMinutes} min travel
                      </div>
                    )}
                  </Collapsible>
                ))}
              </div>
            ))}
          </div>
        ) : (
          // Desktop: Full detailed view
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {Object.entries(jobsByDate).map(([date, jobs]) => (
                <div key={date} className="space-y-2">
                  <div className="text-sm font-semibold text-muted-foreground sticky top-0 bg-card py-1">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </div>
                  {jobs.map((job, idx) => (
                    <div key={job.jobId} className="space-y-2">
                      <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="font-medium">{job.title}</div>
                            {job.customerName && (
                              <div className="text-sm text-muted-foreground">{job.customerName}</div>
                            )}
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {format(new Date(job.startTime), 'h:mm a')} - {format(new Date(job.endTime), 'h:mm a')}
                              </span>
                              {job.assignedToName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {job.assignedToName}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            {Math.round(job.priorityScore * 100)}%
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/50">
                          <span className="font-medium">💡 AI Reasoning:</span> {job.reasoning}
                        </div>
                      </div>
                      {idx < jobs.length - 1 && job.travelTimeMinutes && job.travelTimeMinutes > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-3">
                          <Navigation className="w-3 h-3" />
                          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                          <span>{job.travelTimeMinutes} min travel</span>
                          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Actions */}
        <div className={cn(
          "flex gap-2 pt-2 border-t border-border",
          isMobile && "flex-col sticky bottom-0 bg-card/95 backdrop-blur -mx-6 -mb-6 p-4 rounded-b-lg"
        )}>
          <Button
            onClick={handleApprove}
            disabled={isApproving}
            className={cn(
              "flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white",
              isMobile && "h-12 touch-manipulation"
            )}
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              '✅ Approve Schedule'
            )}
          </Button>
          <Button
            onClick={onReject}
            variant="outline"
            disabled={isApproving}
            className={cn("flex-1", isMobile && "h-12 touch-manipulation")}
          >
            ❌ Reject & Refine
          </Button>
          {onViewCalendar && firstDate && (
            <Button
              onClick={() => onViewCalendar(firstDate)}
              variant="secondary"
              disabled={isApproving}
              className={cn(
                "gap-2",
                isMobile ? "w-full h-12 touch-manipulation" : "flex-shrink-0"
              )}
            >
              <Calendar className="w-4 h-4" />
              View on Calendar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

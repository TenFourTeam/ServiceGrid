import { useState, useEffect } from 'react';
import { AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';

interface PriorityRescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urgentJobData: {
    title: string;
    startsAt: string;
    endsAt: string;
    priority: number;
    address?: string;
  };
  conflictingJobIds: string[];
  onAcceptPlan: (reschedules: any[]) => void;
  onCancel: () => void;
}

interface RescheduleItem {
  jobId: string;
  jobTitle: string;
  originalStart: string;
  originalEnd: string;
  newStart: string;
  newEnd: string;
  reasoning: string;
}

export function PriorityRescheduleModal({
  open,
  onOpenChange,
  urgentJobData,
  conflictingJobIds,
  onAcceptPlan,
  onCancel,
}: PriorityRescheduleModalProps) {
  const [rescuePlan, setRescuePlan] = useState<RescheduleItem[]>([]);
  const [impactSummary, setImpactSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const authApi = useAuthApi();

  useEffect(() => {
    if (open && conflictingJobIds.length > 0) {
      generateRescuePlan();
    }
  }, [open, conflictingJobIds]);

  const generateRescuePlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await authApi.invoke('priority-reschedule', {
        method: 'POST',
        body: {
          urgentJobData,
          conflictingJobIds,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setRescuePlan(data.reschedules || []);
      setImpactSummary(data.impactSummary || null);
    } catch (error: any) {
      console.error('Failed to generate rescue plan:', error);
      toast.error('Failed to generate priority rescue plan');
      setRescuePlan([]);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: number) => {
    const badges = {
      1: { label: '🔴 Urgent', variant: 'destructive' as const },
      2: { label: '🟠 High', variant: 'default' as const },
      3: { label: '🟡 Normal', variant: 'secondary' as const },
      4: { label: '🟢 Low', variant: 'outline' as const },
      5: { label: '⚪ Lowest', variant: 'outline' as const },
    };
    return badges[priority as keyof typeof badges] || badges[3];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Urgent Job Scheduling
          </DialogTitle>
          <DialogDescription>
            This urgent job conflicts with lower-priority jobs. Our AI can help reschedule them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Urgent Job Details */}
          <div className="p-4 border-2 border-destructive rounded-lg bg-destructive/5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-lg">{urgentJobData.title}</h4>
              <Badge {...getPriorityBadge(urgentJobData.priority)} />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                Time: {new Date(urgentJobData.startsAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })} - {new Date(urgentJobData.endsAt).toLocaleString([], {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
              {urgentJobData.address && <div>Address: {urgentJobData.address}</div>}
            </div>
          </div>

          {/* AI Rescue Plan */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Rescue Plan
            </h4>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                Generating optimal rescue plan...
              </div>
            ) : rescuePlan.length > 0 ? (
              <>
                <div className="space-y-3">
                  {rescuePlan.map((item, index) => (
                    <div key={item.jobId} className="p-4 border rounded-lg bg-muted/50">
                      <div className="font-medium mb-2">{item.jobTitle}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span>
                          {new Date(item.originalStart).toLocaleString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-medium text-foreground">
                          {new Date(item.newStart).toLocaleString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground italic">{item.reasoning}</div>
                    </div>
                  ))}
                </div>

                {/* Impact Summary */}
                {impactSummary && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h5 className="font-medium mb-2">Impact Summary</h5>
                    <div className="space-y-1 text-sm">
                      {impactSummary.travelTimeChange && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Travel time:</span>
                          <span>{impactSummary.travelTimeChange}</span>
                        </div>
                      )}
                      {impactSummary.overallImpact && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Overall:</span>
                          <span>{impactSummary.overallImpact}</span>
                        </div>
                      )}
                      {impactSummary.recommendation && (
                        <div className="mt-2 p-2 bg-primary/10 rounded">
                          <span className="font-medium">💡 </span>
                          {impactSummary.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No rescue plan available
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Choose Different Time
          </Button>
          <Button
            variant="default"
            onClick={() => onAcceptPlan(rescuePlan)}
            disabled={loading || rescuePlan.length === 0}
          >
            Apply Rescue Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

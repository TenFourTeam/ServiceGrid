import { useState, useEffect } from 'react';
import { AlertTriangle, Sparkles, Clock } from 'lucide-react';
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

interface RescheduleAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  proposedStartTime: Date;
  proposedEndTime: Date;
  conflicts: Array<{ id: string; title: string; start_time: string; end_time: string }>;
  onAcceptAlternative: (startTime: string, endTime: string) => void;
  onForceMove: () => void;
}

interface AlternativeSlot {
  startTime: string;
  endTime: string;
  reasoning: string;
  routeImpact?: string;
  recommended?: boolean;
}

export function RescheduleAssistant({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  proposedStartTime,
  proposedEndTime,
  conflicts,
  onAcceptAlternative,
  onForceMove,
}: RescheduleAssistantProps) {
  const [alternatives, setAlternatives] = useState<AlternativeSlot[]>([]);
  const [conflictImpact, setConflictImpact] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const authApi = useAuthApi();

  useEffect(() => {
    if (open) {
      fetchSuggestions();
    }
  }, [open]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await authApi.invoke('suggest-reschedule', {
        method: 'POST',
        body: {
          jobId,
          proposedStartTime: proposedStartTime.toISOString(),
          proposedEndTime: proposedEndTime.toISOString(),
          conflicts,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setAlternatives(data.alternatives || []);
      setConflictImpact(data.conflictImpact || 'This move creates conflicts');
    } catch (error: any) {
      console.error('Failed to fetch suggestions:', error);
      toast.error('Failed to generate alternative suggestions');
      setAlternatives([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Scheduling Conflict Detected
          </DialogTitle>
          <DialogDescription>
            Moving this job would create conflicts or impact route efficiency.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Job Being Moved</h4>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{jobTitle}</div>
              <div className="text-sm text-muted-foreground mt-1">
                New time: {proposedStartTime.toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-destructive">Conflicts With</h4>
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="p-2 border border-destructive/50 rounded-md text-sm">
                    <div className="font-medium">{conflict.title}</div>
                    <div className="text-muted-foreground">
                      {new Date(conflict.start_time).toLocaleString([], {
                        hour: 'numeric',
                        minute: '2-digit'
                      })} - {new Date(conflict.end_time).toLocaleString([], {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact Analysis */}
          {conflictImpact && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="text-sm font-medium text-destructive mb-1">Impact Analysis</div>
              <div className="text-sm text-muted-foreground">{conflictImpact}</div>
            </div>
          )}

          {/* AI Suggestions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Better Options
            </h4>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                Analyzing alternatives...
              </div>
            ) : alternatives.length > 0 ? (
              <div className="space-y-2">
                {alternatives.map((alt, index) => (
                  <button
                    key={index}
                    onClick={() => onAcceptAlternative(alt.startTime, alt.endTime)}
                    className="w-full p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {new Date(alt.startTime).toLocaleString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })} - {new Date(alt.endTime).toLocaleString([], {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">{alt.reasoning}</div>
                        {alt.routeImpact && (
                          <div className="text-xs text-muted-foreground italic">{alt.routeImpact}</div>
                        )}
                      </div>
                      {alt.recommended && (
                        <Badge variant="default" className="shrink-0">Recommended</Badge>
                      )}
                    </div>
                  </button>
                ))}

                {/* Keep Original Option */}
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full p-4 border rounded-lg hover:border-muted-foreground hover:bg-accent transition-colors text-left"
                >
                  <div className="font-medium">Keep Original Time</div>
                  <div className="text-sm text-muted-foreground">Cancel the move and keep job at current time</div>
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No alternative suggestions available
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onForceMove}>
            Force Move Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

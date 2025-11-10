import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useAutoScheduleRequest } from '@/hooks/useAutoScheduleRequest';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';

interface AutoScheduleButtonProps {
  requestId: string;
  disabled?: boolean;
  onSuccess?: () => void;
}

export function AutoScheduleButton({ requestId, disabled, onSuccess }: AutoScheduleButtonProps) {
  const isMobile = useIsMobile();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const autoSchedule = useAutoScheduleRequest();

  const handleAutoSchedule = async () => {
    try {
      const result = await autoSchedule.mutateAsync({ requestId });
      setAiSuggestion(result);
      setShowConfirmation(true);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
    onSuccess?.();
  };

  const handleChooseDifferent = () => {
    setShowConfirmation(false);
    // Could trigger manual scheduling modal here
  };

  const suggestionContent = aiSuggestion && (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Recommended Time</div>
        <div className="text-lg font-semibold">
          {new Date(aiSuggestion.job.starts_at).toLocaleString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Duration</div>
        <div>
          {Math.round(
            (new Date(aiSuggestion.job.ends_at).getTime() - 
             new Date(aiSuggestion.job.starts_at).getTime()) / 60000
          )} minutes
        </div>
      </div>

      {aiSuggestion.reasoning && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Reasoning</div>
          <div className="text-sm p-3 bg-muted rounded-md">
            {aiSuggestion.reasoning}
          </div>
        </div>
      )}

      {aiSuggestion.schedulingScore && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Confidence</div>
          <div className="flex items-center gap-2">
            <Badge variant={aiSuggestion.schedulingScore > 0.8 ? 'default' : 'secondary'}>
              {Math.round(aiSuggestion.schedulingScore * 100)}%
            </Badge>
            <span className="text-sm text-muted-foreground">
              {aiSuggestion.schedulingScore > 0.8 ? 'High confidence' : 'Medium confidence'}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const actions = (
    <>
      <Button variant="outline" onClick={handleChooseDifferent}>
        Choose Different Time
      </Button>
      <Button onClick={handleConfirm}>
        Schedule Job
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          onClick={handleAutoSchedule}
          disabled={disabled || autoSchedule.isPending}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {autoSchedule.isPending ? 'Analyzing...' : 'Auto-Schedule'}
        </Button>

        <Drawer open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Scheduling Suggestion
              </DrawerTitle>
              <DrawerDescription>
                Our AI has analyzed your schedule and found the optimal time slot for this request.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4">
              {suggestionContent}
            </div>
            <DrawerFooter className="flex-row gap-2">
              {actions}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleAutoSchedule}
        disabled={disabled || autoSchedule.isPending}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {autoSchedule.isPending ? 'Analyzing...' : 'Auto-Schedule'}
      </Button>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Scheduling Suggestion
            </DialogTitle>
            <DialogDescription>
              Our AI has analyzed your schedule and found the optimal time slot for this request.
            </DialogDescription>
          </DialogHeader>
          {suggestionContent}
          <DialogFooter>
            {actions}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

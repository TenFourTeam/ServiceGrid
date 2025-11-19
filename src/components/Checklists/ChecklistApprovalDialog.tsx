import { useState } from 'react';
import { Check, X, Save, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useChecklistApproval } from '@/hooks/useChecklistApproval';
import { useCreateChecklistTemplate } from '@/hooks/useChecklistTemplates';
import type { Checklist, ChecklistItem } from '@/hooks/useJobChecklist';

interface ChecklistApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklist: Checklist;
  jobId: string;
  confidence?: 'high' | 'medium' | 'low';
}

export function ChecklistApprovalDialog({
  open,
  onOpenChange,
  checklist,
  jobId,
  confidence = 'medium',
}: ChecklistApprovalDialogProps) {
  const { approve, reject } = useChecklistApproval();
  const createTemplate = useCreateChecklistTemplate();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const handleApprove = () => {
    approve.mutate({ checklistId: checklist.id, jobId });
    onOpenChange(false);
  };

  const handleApproveAndSaveTemplate = async () => {
    // First create template
    await createTemplate.mutateAsync({
      name: checklist.title,
      description: `Auto-generated from ${checklist.title}`,
      items: checklist.items?.map((item: ChecklistItem, idx: number) => ({
        title: item.title,
        description: item.description || '',
        position: idx,
        category: item.category || 'General',
        estimated_duration_minutes: item.estimated_duration_minutes || 15,
        required_photo_count: item.required_photo_count,
      })) || [],
    });

    // Then approve
    approve.mutate({ checklistId: checklist.id, jobId });
    onOpenChange(false);
  };

  const handleReject = () => {
    reject.mutate({ checklistId: checklist.id, jobId, reason: rejectionReason });
    onOpenChange(false);
    setShowRejectionForm(false);
    setRejectionReason('');
  };

  const confidenceColors = {
    high: 'bg-green-500',
    medium: 'bg-yellow-500',
    low: 'bg-red-500',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Review AI-Generated Checklist
            </DialogTitle>
            <Badge variant="outline" className="gap-1">
              <div className={`w-2 h-2 rounded-full ${confidenceColors[confidence]}`} />
              {confidence} confidence
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{checklist.title}</h3>
            <p className="text-sm text-muted-foreground">
              {checklist.items?.length || 0} tasks • Review each task before approving
            </p>
          </div>

          {/* Tasks List */}
          <div className="space-y-2 border rounded-lg p-4">
            <h4 className="font-medium mb-3">Tasks</h4>
            {checklist.items?.map((item: ChecklistItem, idx: number) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <h5 className="font-medium">{item.title}</h5>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {item.estimated_duration_minutes && (
                      <span>~{item.estimated_duration_minutes} min</span>
                    )}
                    {item.required_photo_count > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {item.required_photo_count} photo{item.required_photo_count > 1 ? 's' : ''} required
                      </Badge>
                    )}
                    {item.category && (
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Rejection Form */}
          {showRejectionForm && (
            <div className="space-y-2 border border-destructive rounded-lg p-4 bg-destructive/5">
              <Label htmlFor="rejection-reason">Rejection Reason (Optional)</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this checklist doesn't meet requirements..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {!showRejectionForm ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectionForm(true)}
                disabled={approve.isPending || reject.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                variant="secondary"
                onClick={handleApproveAndSaveTemplate}
                disabled={approve.isPending || reject.isPending || createTemplate.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Approve & Save as Template
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approve.isPending || reject.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectionForm(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Confirm Rejection
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

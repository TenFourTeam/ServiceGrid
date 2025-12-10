import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useCustomerAppointmentRequests } from '@/hooks/useCustomerAppointmentRequests';
import type { CustomerJob } from '@/types/customerPortal';

interface CancelRequestDialogProps {
  job: CustomerJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelRequestDialog({ job, open, onOpenChange }: CancelRequestDialogProps) {
  const { requestCancellation } = useCustomerAppointmentRequests();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await requestCancellation.mutateAsync({
        jobId: job.id,
        reason,
      });
      setReason('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Request Cancellation</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to request cancellation for this appointment?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Appointment info */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-medium">{job.title || 'Untitled Appointment'}</p>
            {job.starts_at && (
              <p className="text-muted-foreground">
                {format(new Date(job.starts_at), 'EEEE, MMMM d, yyyy')} at{' '}
                {format(new Date(job.starts_at), 'h:mm a')}
              </p>
            )}
            {job.address && (
              <p className="text-muted-foreground text-xs mt-1">{job.address}</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for Cancellation</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please let us know why you need to cancel..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Note: This is a request. The business will review and confirm the cancellation.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Keep Appointment</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Request Cancellation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

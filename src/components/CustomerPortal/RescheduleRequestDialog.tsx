import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { CalendarClock, Loader2 } from 'lucide-react';
import { useCustomerAppointmentRequests } from '@/hooks/useCustomerAppointmentRequests';
import type { CustomerJob } from '@/types/customerPortal';

interface RescheduleRequestDialogProps {
  job: CustomerJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_PREFERENCES = [
  { id: 'morning', label: 'Morning (8am - 12pm)' },
  { id: 'afternoon', label: 'Afternoon (12pm - 5pm)' },
  { id: 'evening', label: 'Evening (5pm - 8pm)' },
];

export function RescheduleRequestDialog({ job, open, onOpenChange }: RescheduleRequestDialogProps) {
  const { requestReschedule } = useCustomerAppointmentRequests();
  const [preferredDate, setPreferredDate] = useState<Date | undefined>();
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleTimeToggle = (timeId: string) => {
    setPreferredTimes(prev =>
      prev.includes(timeId)
        ? prev.filter(t => t !== timeId)
        : [...prev, timeId]
    );
  };

  const handleSubmit = async () => {
    await requestReschedule.mutateAsync({
      jobId: job.id,
      preferredDate: preferredDate ? format(preferredDate, 'yyyy-MM-dd') : undefined,
      preferredTimes,
      reason,
      customerNotes: notes,
    });

    // Reset form and close
    setPreferredDate(undefined);
    setPreferredTimes([]);
    setReason('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Request Reschedule
          </DialogTitle>
          <DialogDescription>
            Request to reschedule your appointment for "{job.title || 'Untitled Appointment'}".
            The business will review your request and get back to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current appointment info */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-medium">Current Appointment</p>
            {job.starts_at && (
              <p className="text-muted-foreground">
                {format(new Date(job.starts_at), 'EEEE, MMMM d, yyyy')} at{' '}
                {format(new Date(job.starts_at), 'h:mm a')}
              </p>
            )}
          </div>

          {/* Preferred new date */}
          <div className="space-y-2">
            <Label>Preferred New Date (optional)</Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={preferredDate}
                onSelect={setPreferredDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
          </div>

          {/* Time preferences */}
          <div className="space-y-2">
            <Label>Preferred Time (select all that work)</Label>
            <div className="space-y-2">
              {TIME_PREFERENCES.map((time) => (
                <div key={time.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={time.id}
                    checked={preferredTimes.includes(time.id)}
                    onCheckedChange={() => handleTimeToggle(time.id)}
                  />
                  <Label htmlFor={time.id} className="font-normal cursor-pointer">
                    {time.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Rescheduling</Label>
            <Textarea
              id="reason"
              placeholder="Please let us know why you need to reschedule..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Additional notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any other information that might be helpful..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={requestReschedule.isPending}
            className="w-full sm:w-auto"
          >
            {requestReschedule.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

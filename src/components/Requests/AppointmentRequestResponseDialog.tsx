import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, X, User, MapPin, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppointmentChangeRequests, AppointmentChangeRequest } from '@/hooks/useAppointmentChangeRequests';

interface AppointmentRequestResponseDialogProps {
  request: AppointmentChangeRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentRequestResponseDialog({
  request,
  open,
  onOpenChange,
}: AppointmentRequestResponseDialogProps) {
  const [response, setResponse] = useState('');
  const { respond, isResponding } = useAppointmentChangeRequests();

  if (!request) return null;

  const isReschedule = request.request_type === 'reschedule';
  const jobTitle = request.jobs?.title || 'Untitled Job';
  const customerName = request.customers?.name || 'Unknown Customer';
  const customerEmail = request.customers?.email;
  const jobAddress = request.jobs?.address;
  const currentDate = request.jobs?.starts_at 
    ? format(new Date(request.jobs.starts_at), 'EEEE, MMMM d, yyyy \'at\' h:mm a')
    : 'Not scheduled';

  const handleAction = (action: 'approve' | 'deny') => {
    if (!request) return;
    respond({
      requestId: request.id,
      action,
      response: response.trim() || undefined,
    }, {
      onSuccess: () => {
        setResponse('');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReschedule ? (
              <CalendarClock className="h-5 w-5 text-blue-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
            {isReschedule ? 'Reschedule Request' : 'Cancellation Request'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{customerName}</div>
              {customerEmail && (
                <div className="text-sm text-muted-foreground">{customerEmail}</div>
              )}
            </div>
          </div>

          {/* Job Info */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Appointment</Label>
            <div className="p-3 border rounded-lg space-y-2">
              <div className="font-medium">{jobTitle}</div>
              {jobAddress && (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {jobAddress}
                </div>
              )}
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {currentDate}
              </div>
            </div>
          </div>

          <Separator />

          {/* Request Details */}
          {isReschedule && request.preferred_date && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Preferred New Date</Label>
              <div className="p-3 bg-blue-50 text-blue-900 rounded-lg font-medium">
                {format(new Date(request.preferred_date), 'EEEE, MMMM d, yyyy')}
              </div>
              {request.preferred_times && request.preferred_times.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {request.preferred_times.map((time, i) => (
                    <Badge key={i} variant="secondary">{time}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {request.reason && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Reason</Label>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                {request.reason}
              </div>
            </div>
          )}

          {request.customer_notes && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Additional Notes</Label>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                {request.customer_notes}
              </div>
            </div>
          )}

          <Separator />

          {/* Response */}
          <div className="space-y-2">
            <Label htmlFor="response">
              <MessageSquare className="h-4 w-4 inline mr-1" />
              Your Response (Optional)
            </Label>
            <Textarea
              id="response"
              placeholder="Add a message to the customer..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
            />
          </div>

          {isReschedule && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Approving will automatically update the job's scheduled date to the customer's preferred date.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleAction('deny')}
            disabled={isResponding}
          >
            Deny Request
          </Button>
          <Button
            onClick={() => handleAction('approve')}
            disabled={isResponding}
            className={isReschedule ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isResponding ? 'Processing...' : isReschedule ? 'Approve Reschedule' : 'Approve Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

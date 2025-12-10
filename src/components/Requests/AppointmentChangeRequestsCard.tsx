import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, X, Clock, ChevronRight, Check, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppointmentChangeRequests, AppointmentChangeRequest } from '@/hooks/useAppointmentChangeRequests';
import { AppointmentRequestResponseDialog } from './AppointmentRequestResponseDialog';

export function AppointmentChangeRequestsCard() {
  const { requests, isLoading, pendingCount } = useAppointmentChangeRequests();
  const [selectedRequest, setSelectedRequest] = useState<AppointmentChangeRequest | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Customer Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Customer Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No pending requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Customer Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-80">
            <div className="divide-y">
              {pendingRequests.slice(0, 5).map((request) => (
                <RequestRow 
                  key={request.id} 
                  request={request} 
                  onClick={() => setSelectedRequest(request)}
                />
              ))}
            </div>
          </ScrollArea>
          {pendingRequests.length > 5 && (
            <div className="p-3 border-t text-center">
              <span className="text-sm text-muted-foreground">
                +{pendingRequests.length - 5} more requests
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <AppointmentRequestResponseDialog
        request={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      />
    </>
  );
}

function RequestRow({ 
  request, 
  onClick 
}: { 
  request: AppointmentChangeRequest; 
  onClick: () => void;
}) {
  const isReschedule = request.request_type === 'reschedule';
  const jobTitle = request.jobs?.title || 'Untitled Job';
  const customerName = request.customers?.name || 'Unknown Customer';

  return (
    <button
      onClick={onClick}
      className="w-full p-4 hover:bg-accent/50 transition-colors text-left flex items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className={`p-2 rounded-full ${isReschedule ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
          {isReschedule ? <CalendarClock className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{customerName}</div>
          <div className="text-sm text-muted-foreground truncate">
            {isReschedule ? 'Reschedule' : 'Cancel'}: {jobTitle}
          </div>
          {request.preferred_date && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              Preferred: {format(new Date(request.preferred_date), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

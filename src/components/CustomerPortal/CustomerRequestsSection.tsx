import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarClock, XCircle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useCustomerAppointmentRequests } from '@/hooks/useCustomerAppointmentRequests';

export function CustomerRequestsSection() {
  const { requests, isLoading, error } = useCustomerAppointmentRequests();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load requests</p>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No appointment change requests</p>
          <p className="text-xs text-muted-foreground mt-1">
            Requests you make will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        };
      case 'approved':
        return {
          icon: CheckCircle,
          label: 'Approved',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        };
      case 'denied':
        return {
          icon: XCircle,
          label: 'Denied',
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
      default:
        return {
          icon: AlertCircle,
          label: status,
          className: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const getTypeInfo = (type: string) => {
    return type === 'reschedule'
      ? { icon: CalendarClock, label: 'Reschedule' }
      : { icon: XCircle, label: 'Cancellation' };
  };

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const statusInfo = getStatusInfo(request.status);
        const typeInfo = getTypeInfo(request.request_type);
        const StatusIcon = statusInfo.icon;
        const TypeIcon = typeInfo.icon;

        return (
          <Card key={request.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">
                    {typeInfo.label} Request
                  </CardTitle>
                </div>
                <Badge className={statusInfo.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {/* Job info */}
              <div>
                <p className="font-medium">{request.jobs?.title || 'Appointment'}</p>
                {request.jobs?.starts_at && (
                  <p className="text-muted-foreground text-xs">
                    Originally: {format(new Date(request.jobs.starts_at), 'MMM d, yyyy')} at{' '}
                    {format(new Date(request.jobs.starts_at), 'h:mm a')}
                  </p>
                )}
              </div>

              {/* Reschedule preferences */}
              {request.request_type === 'reschedule' && request.preferred_date && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Preferred: </span>
                  {format(new Date(request.preferred_date), 'MMM d, yyyy')}
                  {request.preferred_times && request.preferred_times.length > 0 && (
                    <span> ({request.preferred_times.join(', ')})</span>
                  )}
                </div>
              )}

              {/* Reason */}
              {request.reason && (
                <p className="text-xs text-muted-foreground">
                  Reason: {request.reason}
                </p>
              )}

              {/* Business response */}
              {request.business_response && (
                <div className="bg-muted/50 p-2 rounded text-xs">
                  <p className="font-medium">Response:</p>
                  <p>{request.business_response}</p>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

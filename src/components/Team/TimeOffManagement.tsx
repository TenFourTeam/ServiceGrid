import { useState } from 'react';
import { Calendar, Clock, Check, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTimeOffRequests, useUpdateTimeOffRequest, TimeOffStatus } from '@/hooks/useTimeOff';
import { TimeOffRequestModal } from './TimeOffRequestModal';
import { useProfile } from '@/queries/useProfile';

interface TimeOffManagementProps {
  userId?: string;
  isManager?: boolean;
}

export function TimeOffManagement({ userId, isManager = false }: TimeOffManagementProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: profile } = useProfile();
  const { data: requests, isLoading } = useTimeOffRequests(userId);
  const updateRequest = useUpdateTimeOffRequest();

  const handleApprove = (id: string) => {
    updateRequest.mutate({ id, status: 'approved' });
  };

  const handleDeny = (id: string) => {
    updateRequest.mutate({ id, status: 'denied' });
  };

  const getStatusBadge = (status: TimeOffStatus) => {
    const variants: Record<TimeOffStatus, { variant: any; label: string }> = {
      pending: { variant: 'outline', label: 'Pending' },
      approved: { variant: 'default', label: 'Approved' },
      denied: { variant: 'destructive', label: 'Denied' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('timeOff.title', 'Time Off Requests')}
        </CardTitle>
        {!userId && (
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('timeOff.request', 'Request Time Off')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{request.user?.full_name || request.user?.email}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(request.start_date), 'MMM d')} -{' '}
                        {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </div>
                      {request.reason && (
                        <div className="text-sm text-muted-foreground mt-1">{request.reason}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(request.status)}
                  {isManager && request.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(request.id)}
                        disabled={updateRequest.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeny(request.id)}
                        disabled={updateRequest.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No time off requests</p>
          </div>
        )}
      </CardContent>

      <TimeOffRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </Card>
  );
}

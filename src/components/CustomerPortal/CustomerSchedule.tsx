import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, Loader2, CalendarClock, XCircle, AlertCircle } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { useCustomerJobData } from '@/hooks/useCustomerJobData';
import { useCustomerAppointmentRequests } from '@/hooks/useCustomerAppointmentRequests';
import { RescheduleRequestDialog } from './RescheduleRequestDialog';
import { CancelRequestDialog } from './CancelRequestDialog';
import { CustomerRequestsSection } from './CustomerRequestsSection';
import type { CustomerJob } from '@/types/customerPortal';

export function CustomerSchedule() {
  const { data: jobData, isLoading, error } = useCustomerJobData();
  const { getPendingRequestForJob } = useCustomerAppointmentRequests();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load schedule</p>
      </div>
    );
  }

  const jobs = jobData?.jobs || [];
  
  // Separate jobs by time
  const upcomingJobs = jobs.filter(j => 
    j.starts_at && isFuture(new Date(j.starts_at)) && j.status !== 'Completed'
  ).sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime());
  
  const pastJobs = jobs.filter(j => 
    (j.starts_at && isPast(new Date(j.starts_at))) || j.status === 'Completed'
  ).sort((a, b) => new Date(b.starts_at || '').getTime() - new Date(a.starts_at || '').getTime());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Schedule</h2>
        <p className="text-muted-foreground">
          View your upcoming and past appointments
        </p>
      </div>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-6 mt-4">
          {/* Upcoming */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming ({upcomingJobs.length})
            </h3>
            {upcomingJobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No upcoming appointments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    pendingRequest={getPendingRequestForJob(job.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          {pastJobs.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-muted-foreground">
                Past Appointments ({pastJobs.length})
              </h3>
              <div className="space-y-3 opacity-75">
                {pastJobs.slice(0, 5).map((job) => (
                  <JobCard key={job.id} job={job} isPast />
                ))}
                {pastJobs.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    + {pastJobs.length - 5} more past appointments
                  </p>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <CustomerRequestsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface JobCardProps {
  job: CustomerJob;
  isPast?: boolean;
  pendingRequest?: { request_type: string } | null;
}

function JobCard({ job, isPast, pendingRequest }: JobCardProps) {
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Scheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Canceled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatJobDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), 'h:mm a');
  };

  const assignedMembers = job.job_assignments?.map(a => a.profiles?.full_name).filter(Boolean) || [];
  const canModify = !isPast && job.status !== 'Completed' && job.status !== 'Canceled';

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">
              {job.title || 'Untitled Appointment'}
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              {pendingRequest && (
                <Badge variant="outline" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {pendingRequest.request_type === 'reschedule' ? 'Reschedule' : 'Cancel'} Pending
                </Badge>
              )}
              <Badge className={getStatusColor(job.status)}>
                {job.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.starts_at && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatJobDate(job.starts_at)}</span>
              <span className="text-muted-foreground">
                at {formatTime(job.starts_at)}
                {job.ends_at && ` - ${formatTime(job.ends_at)}`}
              </span>
            </div>
          )}
          
          {job.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>{job.address}</span>
            </div>
          )}
          
          {assignedMembers.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{assignedMembers.join(', ')}</span>
            </div>
          )}
          
          {job.notes && (
            <p className="text-sm text-muted-foreground pl-6">
              {job.notes}
            </p>
          )}

          {/* Action buttons for upcoming jobs without pending requests */}
          {canModify && !pendingRequest && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRescheduleDialogOpen(true)}
                className="flex-1 min-w-[120px]"
              >
                <CalendarClock className="h-4 w-4 mr-1" />
                Reschedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                className="flex-1 min-w-[120px] text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RescheduleRequestDialog
        job={job}
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
      />

      <CancelRequestDialog
        job={job}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />
    </>
  );
}

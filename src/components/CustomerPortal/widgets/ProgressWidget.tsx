import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import type { CustomerJob } from '@/types/customerPortal';

interface ProgressWidgetProps {
  jobs: CustomerJob[];
  upcomingJobs: CustomerJob[];
}

export function ProgressWidget({ jobs, upcomingJobs }: ProgressWidgetProps) {
  const completedJobs = jobs.filter(j => j.status === 'Completed').length;
  const inProgressJobs = jobs.filter(j => j.status === 'In Progress').length;
  const scheduledJobs = jobs.filter(j => j.status === 'Scheduled').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Scheduled': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const formatJobDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    return format(new Date(dateStr), 'h:mm a');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Schedule & Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Job stats */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>{completedJobs} completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{inProgressJobs} in progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>{scheduledJobs} scheduled</span>
          </div>
        </div>

        {/* Upcoming appointments */}
        {upcomingJobs.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Upcoming Appointments</p>
            {upcomingJobs.slice(0, 3).map((job) => (
              <div 
                key={job.id} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className={`w-1 h-full min-h-[40px] rounded-full ${getStatusColor(job.status)}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {job.title || 'Untitled Job'}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    {job.starts_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatJobDate(job.starts_at)} at {formatTime(job.starts_at)}
                      </span>
                    )}
                    {job.address && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {job.address.split(',')[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No upcoming appointments scheduled.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

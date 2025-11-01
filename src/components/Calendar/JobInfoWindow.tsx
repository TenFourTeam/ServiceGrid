import { Job } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, User, X } from 'lucide-react';
import { format } from 'date-fns';

interface JobInfoWindowProps {
  job: Job;
  onClose: () => void;
  onViewDetails?: () => void;
}

/**
 * Info window displayed when clicking a job marker on the map
 */
export function JobInfoWindow({ job, onClose, onViewDetails }: JobInfoWindowProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500/10 text-green-700';
      case 'In Progress':
        return 'bg-yellow-500/10 text-yellow-700';
      case 'Scheduled':
        return 'bg-blue-500/10 text-blue-700';
      case 'Canceled':
        return 'bg-gray-500/10 text-gray-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 w-80 animate-in fade-in slide-in-from-top-2 duration-200">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{job.title || 'Untitled Job'}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge className={getStatusColor(job.status)}>
            {job.status}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3">
          {job.startsAt && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(job.startsAt), 'h:mm a')}
                {job.endsAt && ` - ${format(new Date(job.endsAt), 'h:mm a')}`}
              </span>
            </div>
          )}

          {job.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{job.address}</span>
            </div>
          )}

          {job.notes && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {job.notes}
            </p>
          )}

          {job.priority && job.priority <= 2 && (
            <Badge variant="destructive" className="text-xs">
              High Priority
            </Badge>
          )}

          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => {
                onViewDetails?.();
                onClose();
              }}
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

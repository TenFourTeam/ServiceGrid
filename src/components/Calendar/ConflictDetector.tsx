import { AlertTriangle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Job } from '@/types';
import { checkJobTimeConflict } from '@/utils/jobStatus';

interface ConflictDetectorProps {
  proposedJob: {
    id?: string;
    startTime: Date;
    endTime: Date;
    address?: string;
  };
  existingJobs: Job[];
  travelTimeMinutes?: number;
}

/**
 * Real-time conflict detection component
 * Warns users when creating overlapping appointments
 * Considers travel time buffers between jobs
 */
export function ConflictDetector({ 
  proposedJob, 
  existingJobs,
  travelTimeMinutes = 15 // default 15 min buffer
}: ConflictDetectorProps) {
  const conflictResult = checkJobTimeConflict(
    proposedJob.id || 'new',
    proposedJob.startTime,
    proposedJob.endTime,
    existingJobs.map(j => ({
      id: j.id,
      start_time: j.startsAt || '',
      end_time: j.endsAt || '',
      title: j.title || 'Untitled Job'
    }))
  );

  if (!conflictResult.hasConflict || conflictResult.conflicts.length === 0) {
    return null;
  }

  const conflict = conflictResult.conflicts[0]; // Show first conflict

  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <strong>Scheduling Conflict:</strong> This time slot overlaps with "{conflict.title}"
        {travelTimeMinutes > 0 && (
          <span className="block mt-1 text-sm">
            <Clock className="inline h-3 w-3 mr-1" />
            Consider {travelTimeMinutes} min travel time buffer
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}

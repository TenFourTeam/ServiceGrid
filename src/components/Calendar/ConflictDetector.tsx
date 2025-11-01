import { AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Job } from '@/types';
import { checkJobTimeConflict } from '@/utils/jobStatus';
import { validateSchedulingConstraints, ProposedJob, CustomerPreferences } from '@/utils/schedulingValidation';
import { useBusinessConstraints } from '@/hooks/useBusinessConstraints';
import { useTeamAvailability } from '@/hooks/useTeamAvailability';
import { useTimeOffRequests } from '@/hooks/useTimeOff';

interface ConflictDetectorProps {
  proposedJob: ProposedJob;
  existingJobs: Job[];
  travelTimeMinutes?: number;
  customerPreferences?: CustomerPreferences;
}

/**
 * Real-time conflict detection component
 * Warns users when creating overlapping appointments
 * Considers travel time buffers between jobs
 */
export function ConflictDetector({ 
  proposedJob, 
  existingJobs,
  travelTimeMinutes = 15,
  customerPreferences
}: ConflictDetectorProps) {
  const { data: constraints } = useBusinessConstraints();
  const { data: availability } = useTeamAvailability();
  const { data: timeOffRequests } = useTimeOffRequests();

  // Check basic time conflicts
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

  // Check advanced scheduling constraints
  const validationResult = validateSchedulingConstraints({
    proposedJob,
    existingJobs,
    businessConstraints: constraints || [],
    teamAvailability: availability || [],
    timeOffRequests: timeOffRequests || [],
    customerPreferences,
  });

  const hasAnyIssues = conflictResult.hasConflict || !validationResult.isValid || validationResult.warnings.length > 0;

  if (!hasAnyIssues) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      {/* Time overlap conflicts */}
      {conflictResult.hasConflict && conflictResult.conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Time Conflict:</strong> Overlaps with "{conflictResult.conflicts[0].title}"
            {travelTimeMinutes > 0 && (
              <span className="block mt-1 text-sm">
                <Clock className="inline h-3 w-3 mr-1" />
                Consider {travelTimeMinutes} min travel buffer
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Scheduling constraint violations (errors) */}
      {validationResult.violations.map((violation, idx) => (
        <Alert key={idx} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{violation.type === 'constraint' ? 'Business Rule' : violation.type === 'availability' ? 'Availability' : 'Time Off'}:</strong> {violation.message}
          </AlertDescription>
        </Alert>
      ))}

      {/* Warnings (non-blocking) */}
      {validationResult.warnings.map((warning, idx) => (
        <Alert key={idx} className="border-orange-500 bg-orange-50 text-orange-900">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> {warning.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

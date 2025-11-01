import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { RecurringJobTemplate } from '@/hooks/useRecurringJobs';

interface TimeWindowConflictDetectorProps {
  templates: RecurringJobTemplate[];
  travelTimes?: Array<{ 
    origin: string; 
    destination: string; 
    travelTimeMinutes: number; 
  }>;
}

interface TimeConflict {
  template: RecurringJobTemplate;
  reason: string;
  severity: 'warning' | 'error';
}

export function TimeWindowConflictDetector({ 
  templates, 
  travelTimes 
}: TimeWindowConflictDetectorProps) {
  const conflicts = useMemo(() => {
    const detected: TimeConflict[] = [];

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      
      // Check if time window exists
      if (!template.preferred_time_start || !template.preferred_time_end) {
        continue;
      }

      const startTime = parseTime(template.preferred_time_start);
      const endTime = parseTime(template.preferred_time_end);
      const windowDuration = (endTime - startTime) / (1000 * 60); // minutes

      // Check if job duration exceeds time window
      if (template.estimated_duration_minutes > windowDuration) {
        detected.push({
          template,
          reason: `Job duration (${template.estimated_duration_minutes}min) exceeds time window (${Math.round(windowDuration)}min)`,
          severity: 'error',
        });
        continue;
      }

      // Check for travel time conflicts with adjacent jobs
      if (travelTimes && i > 0) {
        const prevTemplate = templates[i - 1];
        const travelTime = travelTimes.find(
          t => t.origin === prevTemplate.address && t.destination === template.address
        );

        if (travelTime && prevTemplate.preferred_time_end && template.preferred_time_start) {
          const prevEnd = parseTime(prevTemplate.preferred_time_end);
          const currentStart = parseTime(template.preferred_time_start);
          const availableTime = (currentStart - prevEnd) / (1000 * 60); // minutes

          if (availableTime < travelTime.travelTimeMinutes) {
            detected.push({
              template,
              reason: `Insufficient travel time from ${prevTemplate.title} (${Math.round(availableTime)}min available, ${Math.round(travelTime.travelTimeMinutes)}min needed)`,
              severity: 'warning',
            });
          }
        }
      }

      // Check for overlapping time windows with same-day templates
      for (let j = i + 1; j < templates.length; j++) {
        const other = templates[j];
        
        // Only check templates with same recurrence pattern (likely scheduled same day)
        if (
          other.recurrence_pattern === template.recurrence_pattern &&
          other.preferred_time_start &&
          other.preferred_time_end
        ) {
          const otherStart = parseTime(other.preferred_time_start);
          const otherEnd = parseTime(other.preferred_time_end);

          // Check for overlap
          if (
            (startTime >= otherStart && startTime < otherEnd) ||
            (endTime > otherStart && endTime <= otherEnd) ||
            (startTime <= otherStart && endTime >= otherEnd)
          ) {
            detected.push({
              template,
              reason: `Time window overlaps with ${other.title}`,
              severity: 'warning',
            });
            break;
          }
        }
      }
    }

    return detected;
  }, [templates, travelTimes]);

  if (conflicts.length === 0) return null;

  const errors = conflicts.filter(c => c.severity === 'error');
  const warnings = conflicts.filter(c => c.severity === 'warning');

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Time Window Errors ({errors.length})</div>
            <ul className="text-sm space-y-1">
              {errors.map((conflict, idx) => (
                <li key={idx}>
                  <strong>{conflict.template.title}:</strong> {conflict.reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2 flex items-center gap-2">
              Time Window Warnings 
              <Badge variant="secondary">{warnings.length}</Badge>
            </div>
            <ul className="text-sm space-y-1">
              {warnings.map((conflict, idx) => (
                <li key={idx}>
                  <strong>{conflict.template.title}:</strong> {conflict.reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function parseTime(timeStr: string): number {
  // Parse time string like "09:00:00" or "09:00" to timestamp
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

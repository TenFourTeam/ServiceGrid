import { Job } from '@/types';
import { BusinessConstraint } from '@/hooks/useBusinessConstraints';
import { TeamAvailability } from '@/hooks/useTeamAvailability';
import { TimeOffRequest } from '@/hooks/useTimeOff';

export interface ProposedJob {
  id?: string;
  startTime: Date;
  endTime: Date;
  address?: string;
  assignedMembers?: string[];
  customerId?: string;
}

export interface CustomerPreferences {
  preferredDays?: number[];
  preferredTimeWindow?: { start: string; end: string };
  avoidDays?: number[];
  schedulingNotes?: string;
}

export interface SchedulingViolation {
  type: 'constraint' | 'availability' | 'time_off' | 'preference';
  severity: 'error' | 'warning';
  message: string;
  details?: any;
}

export interface ValidationResult {
  isValid: boolean;
  violations: SchedulingViolation[];
  warnings: SchedulingViolation[];
}

export function validateSchedulingConstraints(params: {
  proposedJob: ProposedJob;
  existingJobs: Job[];
  businessConstraints: BusinessConstraint[];
  teamAvailability: TeamAvailability[];
  timeOffRequests: TimeOffRequest[];
  customerPreferences?: CustomerPreferences;
}): ValidationResult {
  const { proposedJob, existingJobs, businessConstraints, teamAvailability, timeOffRequests, customerPreferences } = params;
  const violations: SchedulingViolation[] = [];
  const warnings: SchedulingViolation[] = [];

  const jobDate = proposedJob.startTime;
  const dayOfWeek = jobDate.getDay();
  
  // Check max jobs per day
  const maxJobsConstraint = businessConstraints.find(c => c.constraint_type === 'max_jobs_per_day' && c.is_active);
  if (maxJobsConstraint) {
    const jobsOnSameDay = existingJobs.filter(j => {
      if (!j.startsAt) return false;
      const jDate = new Date(j.startsAt);
      return jDate.toDateString() === jobDate.toDateString() && j.id !== proposedJob.id;
    });
    
    if (jobsOnSameDay.length >= maxJobsConstraint.constraint_value) {
      violations.push({
        type: 'constraint',
        severity: 'error',
        message: `Maximum jobs per day (${maxJobsConstraint.constraint_value}) exceeded. Currently ${jobsOnSameDay.length} scheduled.`,
      });
    }
  }

  // Check max hours per day
  const maxHoursConstraint = businessConstraints.find(c => c.constraint_type === 'max_hours_per_day' && c.is_active);
  if (maxHoursConstraint) {
    const jobDurationHours = (proposedJob.endTime.getTime() - proposedJob.startTime.getTime()) / (1000 * 60 * 60);
    const jobsOnSameDay = existingJobs.filter(j => {
      if (!j.startsAt) return false;
      const jDate = new Date(j.startsAt);
      return jDate.toDateString() === jobDate.toDateString() && j.id !== proposedJob.id;
    });
    
    const totalHours = jobsOnSameDay.reduce((sum, j) => {
      if (!j.startsAt || !j.endsAt) return sum;
      const duration = (new Date(j.endsAt).getTime() - new Date(j.startsAt).getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, jobDurationHours);
    
    if (totalHours > maxHoursConstraint.constraint_value) {
      violations.push({
        type: 'constraint',
        severity: 'error',
        message: `Maximum hours per day (${maxHoursConstraint.constraint_value}h) exceeded. Total: ${totalHours.toFixed(1)}h`,
      });
    }
  }

  // Check team member availability
  if (proposedJob.assignedMembers && proposedJob.assignedMembers.length > 0) {
    proposedJob.assignedMembers.forEach(userId => {
      const userAvailability = teamAvailability.filter(a => a.user_id === userId && a.day_of_week === dayOfWeek && a.is_available);
      
      if (userAvailability.length === 0) {
        violations.push({
          type: 'availability',
          severity: 'error',
          message: `Team member is not available on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}`,
        });
      } else {
        // Check time windows
        const jobStartTime = proposedJob.startTime.toTimeString().slice(0, 5);
        const jobEndTime = proposedJob.endTime.toTimeString().slice(0, 5);
        
        const isWithinAvailableWindow = userAvailability.some(a => {
          return jobStartTime >= a.start_time && jobEndTime <= a.end_time;
        });
        
        if (!isWithinAvailableWindow) {
          warnings.push({
            type: 'availability',
            severity: 'warning',
            message: `Job time may be outside team member's available hours`,
          });
        }
      }
      
      // Check time-off requests
      const hasTimeOff = timeOffRequests.some(req => {
        if (req.user_id !== userId || req.status !== 'approved') return false;
        const reqStart = new Date(req.start_date);
        const reqEnd = new Date(req.end_date);
        return jobDate >= reqStart && jobDate <= reqEnd;
      });
      
      if (hasTimeOff) {
        violations.push({
          type: 'time_off',
          severity: 'error',
          message: `Team member has approved time off on this date`,
        });
      }
    });
  }

  // Check customer preferences (warnings only)
  if (customerPreferences) {
    if (customerPreferences.avoidDays && customerPreferences.avoidDays.includes(dayOfWeek)) {
      warnings.push({
        type: 'preference',
        severity: 'warning',
        message: `Customer prefers to avoid ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}s`,
      });
    }
    
    if (customerPreferences.preferredDays && customerPreferences.preferredDays.length > 0) {
      if (!customerPreferences.preferredDays.includes(dayOfWeek)) {
        warnings.push({
          type: 'preference',
          severity: 'warning',
          message: `Not a preferred day for this customer`,
        });
      }
    }
    
    if (customerPreferences.preferredTimeWindow) {
      const jobStartTime = proposedJob.startTime.toTimeString().slice(0, 5);
      const { start, end } = customerPreferences.preferredTimeWindow;
      
      if (jobStartTime < start || jobStartTime > end) {
        warnings.push({
          type: 'preference',
          severity: 'warning',
          message: `Outside customer's preferred time window (${start} - ${end})`,
        });
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
  };
}

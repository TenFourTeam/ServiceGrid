import { JobStatus } from "@/types";

export function getJobStatusColors(status: JobStatus, isAssessment?: boolean) {
  // Assessment jobs get special styling regardless of status
  if (isAssessment) {
    return {
      bg: 'bg-status-assessment',
      text: 'text-status-assessment-foreground',
      border: 'border-status-assessment/20'
    };
  }
  
  switch (status) {
    case 'Scheduled':
      return {
        bg: 'bg-status-scheduled',
        text: 'text-status-scheduled-foreground',
        border: 'border-status-scheduled/20'
      };
    case 'Schedule Approved':
      return {
        bg: 'bg-status-approved',
        text: 'text-status-approved-foreground',
        border: 'border-status-approved/20'
      };
    case 'In Progress':
      return {
        bg: 'bg-status-in-progress',
        text: 'text-status-in-progress-foreground',
        border: 'border-status-in-progress/20'
      };
    case 'Completed':
      return {
        bg: 'bg-status-completed',
        text: 'text-status-completed-foreground',
        border: 'border-status-completed/20'
      };
    default:
      return {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        border: 'border-muted'
      };
  }
}

export function canDragJob(status: JobStatus, currentTime: Date, jobStartTime: Date): boolean {
  // Completed jobs cannot be moved
  if (status === 'Completed') return false;
  
  // In Progress jobs cannot be moved
  if (status === 'In Progress') return false;
  
  // Scheduled jobs can always be moved
  return true;
}

export function canResizeJob(status: JobStatus, currentTime: Date, jobStartTime: Date, jobEndTime: Date): boolean {
  // Completed jobs cannot be resized
  if (status === 'Completed') return false;
  
  // Scheduled jobs can be fully resized
  if (status === 'Scheduled') return true;
  
  // In Progress jobs can only be extended (end time moved forward)
  if (status === 'In Progress') {
    return true; // We'll handle the constraint in the resize logic
  }
  
  return false;
}

export function validateJobTiming(status: JobStatus, startTime: Date, endTime: Date, currentTime: Date): { isValid: boolean; error?: string } {
  // Completed jobs should not exist after current time
  if (status === 'Completed' && endTime > currentTime) {
    return {
      isValid: false,
      error: 'Completed jobs cannot be scheduled after the current time'
    };
  }
  
  // In Progress jobs should have started but not ended
  if (status === 'In Progress') {
    if (startTime > currentTime) {
      return {
        isValid: false,
        error: 'In Progress jobs cannot be scheduled in the future'
      };
    }
    if (endTime <= currentTime) {
      return {
        isValid: false,
        error: 'In Progress jobs should extend beyond the current time'
      };
    }
  }
  
  return { isValid: true };
}

export function hasTimeOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && start2 < end1;
}

export function checkJobTimeConflict(
  jobId: string, 
  startTime: Date, 
  endTime: Date, 
  existingJobs: Array<{ id: string; start_time: string; end_time: string; title: string }>
): { hasConflict: boolean; conflicts: Array<{ id: string; title: string; start: Date; end: Date }> } {
  const conflicts = existingJobs
    .filter(job => job.id !== jobId) // Exclude the job being moved
    .filter(job => {
      const jobStart = new Date(job.start_time);
      const jobEnd = new Date(job.end_time);
      return hasTimeOverlap(startTime, endTime, jobStart, jobEnd);
    })
    .map(job => ({
      id: job.id,
      title: job.title,
      start: new Date(job.start_time),
      end: new Date(job.end_time)
    }));

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

/**
 * Determines if a job should automatically transition to "In Progress" status
 */
export function shouldJobBeInProgress(job: { status: string; startsAt: string | null; endsAt: string | null }, currentTime: Date): boolean {
  if ((job.status !== 'Scheduled' && job.status !== 'Schedule Approved') || !job.startsAt || !job.endsAt) {
    return false;
  }
  
  const startTime = new Date(job.startsAt);
  const endTime = new Date(job.endsAt);
  
  return startTime <= currentTime && endTime > currentTime;
}

/**
 * Determines if a job should automatically transition to "Completed" status
 */
export function shouldJobBeCompleted(job: { status: string; endsAt: string | null }, currentTime: Date): boolean {
  if (job.status !== 'In Progress' || !job.endsAt) {
    return false;
  }
  
  const endTime = new Date(job.endsAt);
  return endTime <= currentTime;
}

/**
 * Finds all jobs that need automatic status updates
 */
export function getJobsRequiringStatusUpdate(
  jobs: Array<{ id: string; status: string; startsAt: string | null; endsAt: string | null; title?: string | null }>, 
  currentTime: Date
): Array<{ id: string; newStatus: 'In Progress' | 'Completed'; reason: string }> {
  const updates: Array<{ id: string; newStatus: 'In Progress' | 'Completed'; reason: string }> = [];
  
  // Find jobs that should be "In Progress"
  const shouldBeInProgress = jobs.filter(job => shouldJobBeInProgress(job, currentTime));
  
  // Find jobs that should be completed
  const shouldBeCompleted = jobs.filter(job => shouldJobBeCompleted(job, currentTime));
  
  // Only allow one job to be "In Progress" at a time
  if (shouldBeInProgress.length > 0) {
    // Sort by start time and take the most recent one
    const mostRecent = shouldBeInProgress.sort((a, b) => 
      new Date(b.startsAt!).getTime() - new Date(a.startsAt!).getTime()
    )[0];
    
    updates.push({
      id: mostRecent.id,
      newStatus: 'In Progress',
      reason: 'Current time is within job window'
    });
    
    // Force complete any other "In Progress" jobs to maintain single active job rule
    const otherInProgress = jobs.filter(job => 
      job.status === 'In Progress' && 
      job.id !== mostRecent.id
    );
    
    otherInProgress.forEach(job => {
      updates.push({
        id: job.id,
        newStatus: 'Completed',
        reason: 'Only one job can be in progress at a time'
      });
    });
  }
  
  // Auto-complete past "In Progress" jobs
  shouldBeCompleted.forEach(job => {
    updates.push({
      id: job.id,
      newStatus: 'Completed',
      reason: 'Job end time has passed'
    });
  });
  
  return updates;
}
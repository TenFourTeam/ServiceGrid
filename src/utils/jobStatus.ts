import { JobStatus } from "@/types";

export function getJobStatusColors(status: JobStatus) {
  switch (status) {
    case 'Scheduled':
      return {
        bg: 'bg-status-scheduled',
        text: 'text-status-scheduled-foreground',
        border: 'border-status-scheduled/20'
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
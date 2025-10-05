import { JobStatus, JobType } from "@/types";

export function getJobStatusColors(status: JobStatus, isAssessment?: boolean, jobType?: JobType) {
  // Assessment jobs get special styling regardless of status
  if (isAssessment) {
    return {
      bg: 'bg-status-assessment',
      text: 'text-status-assessment-foreground',
      border: 'border-status-assessment/20'
    };
  }
  
  // Time & Materials jobs get special styling when scheduled
  if (jobType === 'time_and_materials' && status === 'Scheduled') {
    return {
      bg: 'bg-status-time-materials',
      text: 'text-status-time-materials-foreground',
      border: 'border-status-time-materials/20'
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
  // Allow all jobs to be moved regardless of status
  return true;
}

export function canResizeJob(status: JobStatus, currentTime: Date, jobStartTime: Date, jobEndTime: Date): boolean {
  // Allow all jobs to be resized regardless of status
  return true;
}

export function validateJobTiming(status: JobStatus, startTime: Date, endTime: Date, currentTime: Date): { isValid: boolean; error?: string } {
  // Allow any timing - no restrictions based on status
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

// Automatic status updates have been disabled
// Job status is now controlled manually via Start/Stop Job buttons
// Only time_and_materials jobs can be "In Progress"
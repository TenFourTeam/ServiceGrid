import type { Job } from '@/types';

/**
 * Get a display-friendly name for a job, with smart fallbacks
 * 
 * Priority order:
 * 1. Job title (if set)
 * 2. Customer name (if available)
 * 3. First part of address (before comma)
 * 4. 'Untitled Job' as last resort
 */
export function getJobDisplayName(job: Partial<Job> | Job): string {
  if (job.title) return job.title;
  if (job.customerName) return job.customerName;
  if (job.address) return job.address.split(',')[0]; // First part of address
  return 'Untitled Job';
}

import type { Job } from "@/types";
import { getAppUrl } from "./env";

interface JobConfirmationConfig {
  job: Job;
  customerName: string;
  businessName: string;
}

/**
 * Generate job confirmation URL for work order emails
 */
export function generateJobConfirmationUrl(jobId: string, token: string): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/job-action?type=confirm&job_id=${jobId}&token=${token}`;
}

/**
 * Generate job confirmation email data
 */
export function generateJobConfirmationEmail({
  job,
  customerName,
  businessName
}: JobConfirmationConfig) {
  const confirmationUrl = generateJobConfirmationUrl(job.id, job.confirmationToken || '');
  
  return {
    confirmationUrl,
    subject: `${businessName} • Appointment Confirmation Required`,
    customerName,
    businessName,
    jobDetails: {
      title: job.title || 'Service Appointment',
      address: job.address,
      startsAt: job.startsAt,
      notes: job.notes
    }
  };
}

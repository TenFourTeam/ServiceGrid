/**
 * Work Order Confirmation Email Template
 * 
 * Generates HTML email content for job/work order confirmations.
 * Used by send-work-order-confirmations edge function.
 */

export interface WorkOrderConfirmationEmailData {
  businessName: string;
  businessPhone?: string;
  businessEmail?: string;
  jobTitle: string;
  formattedDate: string;
  formattedStartTime: string;
  formattedEndTime?: string;
  address?: string;
  notes?: string;
  confirmationUrl: string;
}

export interface WorkOrderConfirmationEmailResult {
  subject: string;
  html: string;
}

/**
 * Generates a work order confirmation email with job details and confirmation link
 */
export function generateWorkOrderConfirmationEmail(
  data: WorkOrderConfirmationEmailData
): WorkOrderConfirmationEmailResult {
  const {
    businessName,
    businessPhone,
    businessEmail,
    jobTitle,
    formattedDate,
    formattedStartTime,
    formattedEndTime,
    address,
    notes,
    confirmationUrl,
  } = data;

  const subject = `Service Appointment Scheduled - ${businessName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1f2937; font-size: 24px; margin: 0;">${businessName}</h1>
      </div>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 16px 0;">Service Appointment Scheduled</h2>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #374151;">Service:</strong> ${jobTitle}
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #374151;">Date:</strong> ${formattedDate}
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #374151;">Time:</strong> ${formattedStartTime}${formattedEndTime ? ` - ${formattedEndTime}` : ''}
        </div>
        
        ${address ? `
          <div style="margin-bottom: 16px;">
            <strong style="color: #374151;">Address:</strong> ${address}
          </div>
        ` : ''}
        
        ${notes ? `
          <div>
            <strong style="color: #374151;">Notes:</strong> ${notes}
          </div>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <p style="color: #6b7280; margin-bottom: 24px;">
          Please confirm your appointment to help us serve you better.
        </p>
        
        <a href="${confirmationUrl}" 
           style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600;">
          Confirm Appointment
        </a>
      </div>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Need to reschedule or have questions?</p>
        ${businessPhone ? `<p>Call us: ${businessPhone}</p>` : ''}
        ${businessEmail ? `<p>Email us: ${businessEmail}</p>` : ''}
      </div>
    </div>
  `;

  return { subject, html };
}

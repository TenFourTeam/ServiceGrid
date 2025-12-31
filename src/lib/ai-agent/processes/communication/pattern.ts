/**
 * Customer Communication Multi-Step Patterns
 * 
 * Workflow patterns for the 5 communication sub-processes.
 */

import type { MultiStepPattern } from '../types';

/**
 * Complete Customer Communication Pattern
 * Full workflow from receiving inquiry to post-service follow-up
 */
export const PATTERN: MultiStepPattern = {
  id: 'complete_customer_communication',
  name: 'Complete Customer Communication',
  description: 'Full workflow for customer communication across the service lifecycle',
  category: 'pre-service',
  
  steps: [
    // Step 1: Get or create conversation
    {
      order: 1,
      tool: 'get_or_create_conversation',
      description: 'Get existing conversation or create new one for customer',
      inputMapping: {
        customerId: 'context.customerId',
        businessId: 'context.businessId',
        jobId: 'context.jobId',
        title: 'context.conversationTitle'
      },
      outputKey: 'conversation',
      optional: false,
      retryOnFail: true
    },
    // Step 2: Retrieve customer context
    {
      order: 2,
      tool: 'get_customer',
      description: 'Retrieve customer details and contact information',
      inputMapping: {
        customerId: 'context.customerId'
      },
      outputKey: 'customer',
      optional: false,
      retryOnFail: true
    },
    // Step 3: Send the message
    {
      order: 3,
      tool: 'send_message',
      description: 'Send the message in the conversation',
      inputMapping: {
        conversationId: 'results.conversation.id',
        content: 'context.messageContent',
        senderId: 'context.userId'
      },
      outputKey: 'message',
      optional: false,
      retryOnFail: true
    },
    // Step 4: Also send as email if requested
    {
      order: 4,
      tool: 'send_email',
      description: 'Also send as email notification if enabled',
      inputMapping: {
        recipientEmail: 'results.customer.email',
        recipientName: 'results.customer.name',
        subject: 'context.emailSubject',
        body: 'context.messageContent',
        businessId: 'context.businessId'
      },
      outputKey: 'email',
      optional: true,
      skipIf: 'context.skipEmail === true'
    }
  ],
  
  preconditions: [
    'Customer must exist and have valid contact info',
    'User must have permission to communicate',
    'Business must have email sending configured (for email step)'
  ],
  
  postconditions: [
    'Message is stored in conversation history',
    'Customer receives communication via selected channel',
    'Activity is logged for audit'
  ],
  
  successMetrics: [
    'Message delivered successfully',
    'No duplicate messages sent',
    'Response time under 2 seconds'
  ],
  
  estimatedDurationMs: 5000,
  specialCardType: undefined
};

/**
 * Job Status Update Pattern
 * Send real-time status update to customer when job status changes
 */
export const JOB_STATUS_UPDATE_PATTERN: MultiStepPattern = {
  id: 'job_status_customer_update',
  name: 'Job Status Customer Update',
  description: 'Notify customer when job status changes (en_route, in_progress, completed)',
  category: 'service-delivery',
  
  steps: [
    {
      order: 1,
      tool: 'get_job',
      description: 'Get job details including customer',
      inputMapping: {
        jobId: 'context.jobId'
      },
      outputKey: 'job',
      optional: false,
      retryOnFail: true
    },
    {
      order: 2,
      tool: 'get_or_create_conversation',
      description: 'Get conversation for this job/customer',
      inputMapping: {
        customerId: 'results.job.customer_id',
        businessId: 'context.businessId',
        jobId: 'context.jobId'
      },
      outputKey: 'conversation',
      optional: false,
      retryOnFail: true
    },
    {
      order: 3,
      tool: 'send_message',
      description: 'Send status update message',
      inputMapping: {
        conversationId: 'results.conversation.id',
        content: 'context.statusMessage',
        senderId: 'context.systemUserId',
        messageType: 'status_update'
      },
      outputKey: 'message',
      optional: false,
      retryOnFail: true
    }
  ],
  
  preconditions: [
    'Job must exist',
    'Customer must have contact info',
    'Status change must be customer-relevant'
  ],
  
  postconditions: [
    'Customer notified of status change',
    'Message logged in conversation',
    'Real-time push sent if customer online'
  ],
  
  successMetrics: [
    'Notification sent within 30 seconds of status change',
    'Customer engagement rate tracked'
  ],
  
  estimatedDurationMs: 2000
};

/**
 * Post-Service Follow-Up Pattern
 * Queue follow-up email after job completion
 */
export const POST_SERVICE_FOLLOWUP_PATTERN: MultiStepPattern = {
  id: 'post_service_followup',
  name: 'Post-Service Follow-Up',
  description: 'Send follow-up communication after job completion',
  category: 'post-service',
  
  steps: [
    {
      order: 1,
      tool: 'get_job',
      description: 'Get completed job details',
      inputMapping: {
        jobId: 'context.jobId'
      },
      outputKey: 'job',
      optional: false,
      retryOnFail: true
    },
    {
      order: 2,
      tool: 'get_customer',
      description: 'Get customer contact info',
      inputMapping: {
        customerId: 'results.job.customer_id'
      },
      outputKey: 'customer',
      optional: false,
      retryOnFail: true
    },
    {
      order: 3,
      tool: 'queue_email',
      description: 'Queue follow-up email for scheduled delivery',
      inputMapping: {
        recipientEmail: 'results.customer.email',
        recipientName: 'results.customer.name',
        emailType: 'job_followup',
        businessId: 'context.businessId',
        customerId: 'results.customer.id',
        scheduledFor: 'context.followupTime',
        subject: 'context.followupSubject',
        bodyTemplate: 'context.followupTemplate'
      },
      outputKey: 'queuedEmail',
      optional: false,
      retryOnFail: true
    }
  ],
  
  preconditions: [
    'Job must be completed',
    'Customer must have email address',
    'Follow-up not already sent for this job'
  ],
  
  postconditions: [
    'Follow-up email queued for delivery',
    'Scheduled time respects business configuration',
    'Email will be processed by cron job'
  ],
  
  successMetrics: [
    'Follow-up queued within 1 minute of job completion',
    'Email delivered at scheduled time',
    'Customer feedback collected'
  ],
  
  estimatedDurationMs: 1500
};

/**
 * All communication patterns
 */
export const COMMUNICATION_PATTERNS = {
  PATTERN,
  JOB_STATUS_UPDATE_PATTERN,
  POST_SERVICE_FOLLOWUP_PATTERN
};

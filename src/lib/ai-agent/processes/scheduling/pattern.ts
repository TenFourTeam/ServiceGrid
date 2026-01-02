/**
 * Scheduling Multi-Step Pattern
 */

import type { MultiStepPattern } from '../types';

export const PATTERN: MultiStepPattern = {
  id: 'complete_scheduling',
  name: 'Complete Scheduling Workflow',
  description: 'Schedule a job with optimal time slot and team assignment',
  category: 'pre-service',
  estimatedDurationMs: 30000,
  specialCardType: 'lead_workflow',
  
  steps: [
    {
      order: 1,
      tool: 'get_customer',
      description: 'Load customer with scheduling preferences',
      inputMapping: {
        customer_id: 'input.customer_id'
      },
      outputKey: 'customer',
      optional: false,
      retryOnFail: true
    },
    {
      order: 2,
      tool: 'get_quote',
      description: 'Load approved quote if available',
      inputMapping: {
        quote_id: 'input.quote_id'
      },
      outputKey: 'quote',
      optional: true,
      skipIf: '!input.quote_id'
    },
    {
      order: 3,
      tool: 'check_team_availability',
      description: 'Check team availability for requested date',
      inputMapping: {
        date: 'input.preferred_date',
        duration_minutes: 'input.duration_minutes'
      },
      outputKey: 'availability',
      optional: false,
      retryOnFail: true
    },
    {
      order: 4,
      tool: 'create_job',
      description: 'Create the job record',
      inputMapping: {
        customer_id: 'input.customer_id',
        quote_id: 'input.quote_id',
        request_id: 'input.request_id',
        title: 'input.title',
        description: 'input.description',
        address: 'customer.address'
      },
      outputKey: 'job',
      optional: false,
      retryOnFail: true
    },
    {
      order: 5,
      tool: 'schedule_job',
      description: 'Set the job schedule',
      inputMapping: {
        job_id: 'job.id',
        starts_at: 'input.starts_at',
        ends_at: 'input.ends_at'
      },
      outputKey: 'scheduled_job',
      optional: false,
      retryOnFail: true
    },
    {
      order: 6,
      tool: 'assign_job',
      description: 'Assign team member to the job',
      inputMapping: {
        job_id: 'job.id',
        user_id: 'input.assigned_to || availability.recommended_user_id'
      },
      outputKey: 'assignment',
      optional: true,
      skipIf: '!input.assigned_to && !availability.recommended_user_id'
    },
    {
      order: 7,
      tool: 'send_job_confirmation',
      description: 'Send confirmation to customer',
      inputMapping: {
        job_id: 'job.id'
      },
      outputKey: 'confirmation',
      optional: true,
      skipIf: 'input.skip_confirmation === true'
    }
  ],
  
  preconditions: [
    'input.customer_id must be provided',
    'Customer must exist in database',
    'Preferred date or time slot must be provided'
  ],
  
  postconditions: [
    'Job record created in database',
    'Job has scheduled time set',
    'Job status is Scheduled',
    'If assignment requested, team member assigned',
    'If not skipped, confirmation sent'
  ],
  
  successMetrics: [
    'job_created',
    'job_scheduled',
    'assignment_made_if_requested',
    'confirmation_sent_if_not_skipped'
  ]
};

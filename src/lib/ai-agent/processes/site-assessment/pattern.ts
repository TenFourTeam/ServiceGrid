/**
 * Site Assessment Multi-Step Pattern
 */

import type { MultiStepPattern } from '../types';

export const PATTERN: MultiStepPattern = {
  id: 'complete_site_assessment',
  name: 'Complete Site Assessment',
  description: 'End-to-end site assessment workflow from request to report generation',
  category: 'pre-service',
  estimatedDurationMs: 15000,
  specialCardType: 'assessment_workflow',
  steps: [
    {
      order: 1,
      tool: 'search_customers',
      description: 'Check for existing customer record',
      inputMapping: {
        email: '{{input.email}}',
        phone: '{{input.phone}}'
      },
      outputKey: 'existing_customer',
      optional: false,
    },
    {
      order: 2,
      tool: 'create_customer',
      description: 'Create customer if not found',
      inputMapping: {
        name: '{{input.name}}',
        email: '{{input.email}}',
        phone: '{{input.phone}}',
        address: '{{input.address}}'
      },
      outputKey: 'customer',
      skipIf: '{{existing_customer.found}}',
    },
    {
      order: 3,
      tool: 'create_request',
      description: 'Log assessment request in system',
      inputMapping: {
        customer_id: '{{customer.id || existing_customer.id}}',
        title: '{{input.request_title || "Site Assessment"}}',
        description: '{{input.request_description}}'
      },
      outputKey: 'request',
      optional: true,
    },
    {
      order: 4,
      tool: 'check_team_availability',
      description: 'Check assessor availability',
      inputMapping: {
        business_id: '{{context.business_id}}',
        preferred_date: '{{input.preferred_date}}'
      },
      outputKey: 'availability',
    },
    {
      order: 5,
      tool: 'create_assessment_job',
      description: 'Create assessment job with scheduling',
      inputMapping: {
        customer_id: '{{customer.id || existing_customer.id}}',
        address: '{{input.address}}',
        starts_at: '{{input.starts_at}}',
        title: '{{input.title || "Site Assessment"}}',
        notes: '{{input.access_instructions}}'
      },
      outputKey: 'assessment_job',
    },
    {
      order: 6,
      tool: 'assign_job',
      description: 'Assign assessor to job',
      inputMapping: {
        job_id: '{{assessment_job.id}}',
        user_id: '{{input.assigned_to || availability.best_match}}'
      },
      outputKey: 'assignment',
      optional: true,
    },
    {
      order: 7,
      tool: 'send_job_confirmation',
      description: 'Send confirmation to customer',
      inputMapping: {
        job_id: '{{assessment_job.id}}'
      },
      outputKey: 'confirmation_sent',
      optional: true,
      retryOnFail: true,
    },
  ],
  preconditions: [
    'Input must contain customer identifier (name, email, or phone)',
    'Address is required for site assessment',
    'Preferred date/time should be specified'
  ],
  postconditions: [
    'Assessment job exists with is_assessment=true',
    'Job is scheduled with starts_at set',
    'Customer has been notified if email provided'
  ],
  successMetrics: [
    'customer_identified',
    'request_logged',
    'assessment_scheduled',
    'assessor_assigned',
    'customer_notified'
  ],
};

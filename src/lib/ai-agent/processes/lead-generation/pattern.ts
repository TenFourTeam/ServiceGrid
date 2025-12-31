/**
 * Lead Generation Multi-Step Pattern
 */

import type { MultiStepPattern } from '../types';

export const PATTERN: MultiStepPattern = {
  id: 'complete_lead_generation',
  name: 'Complete Lead Generation',
  description: 'End-to-end lead capture, qualification, and initial contact workflow',
  category: 'pre-service',
  estimatedDurationMs: 5000,
  specialCardType: 'lead_workflow',
  steps: [
    {
      order: 1,
      tool: 'search_customers',
      description: 'Check for existing customer to avoid duplicates',
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
      description: 'Create new customer record if no duplicate found',
      inputMapping: {
        name: '{{input.name}}',
        email: '{{input.email}}',
        phone: '{{input.phone}}',
        address: '{{input.address}}',
        lead_source: '{{input.lead_source}}',
        notes: '{{input.notes}}',
      },
      outputKey: 'new_customer',
      skipIf: '{{existing_customer.found}}',
    },
    {
      order: 3,
      tool: 'score_lead',
      description: 'Calculate lead quality score based on data completeness',
      inputMapping: { customer_id: '{{new_customer.id}}' },
      outputKey: 'lead_score',
    },
    {
      order: 4,
      tool: 'create_request',
      description: 'Log initial service request for the lead',
      inputMapping: {
        customer_id: '{{new_customer.id}}',
        title: '{{input.request_title}}',
        description: '{{input.request_description}}',
      },
      outputKey: 'new_request',
      optional: true,
    },
    {
      order: 5,
      tool: 'check_team_availability',
      description: 'Check which team members are available for assignment',
      inputMapping: { business_id: '{{context.business_id}}' },
      outputKey: 'available_team',
    },
    {
      order: 6,
      tool: 'auto_assign_lead',
      description: 'Assign lead to best available team member',
      inputMapping: {
        request_id: '{{new_request.id}}',
        available_members: '{{available_team.members}}',
      },
      outputKey: 'assignment',
      skipIf: '{{!new_request.id}}',
    },
    {
      order: 7,
      tool: 'send_email',
      description: 'Send welcome email to new lead',
      inputMapping: {
        customer_id: '{{new_customer.id}}',
        template: 'welcome',
      },
      outputKey: 'email_sent',
      optional: true,
      retryOnFail: true,
    },
  ],
  preconditions: [
    'Input must contain at least name and (email or phone)',
    'Business must have automation settings configured',
  ],
  postconditions: [
    'Customer record exists with calculated lead_score',
    'If request created, it has assigned_to populated',
    'Activity logged to ai_activity_log',
  ],
  successMetrics: [
    'customer_created',
    'lead_scored',
    'request_created',
    'lead_assigned',
    'welcome_email_sent',
  ],
};

/**
 * Multi-Step Patterns - Defines complete workflow patterns for the AI agent
 * Each pattern represents an end-to-end process with ordered steps, 
 * input/output mappings, and success metrics
 */

import { ToolContract } from './tool-contracts';

export interface PatternStep {
  order: number;
  tool: string;
  description: string;
  inputMapping: Record<string, string>;
  outputKey: string;
  optional?: boolean;
  skipIf?: string;
  retryOnFail?: boolean;
}

export interface MultiStepPattern {
  id: string;
  name: string;
  description: string;
  category: 'pre-service' | 'service-delivery' | 'post-service' | 'operations';
  steps: PatternStep[];
  preconditions: string[];
  postconditions: string[];
  successMetrics: string[];
  estimatedDurationMs: number;
  specialCardType?: 'lead_workflow' | 'assessment_workflow';
}

// ============================================================================
// LEAD GENERATION PATTERNS
// ============================================================================

export const COMPLETE_LEAD_GENERATION: MultiStepPattern = {
  id: 'complete_lead_generation',
  name: 'Complete Lead Generation',
  description: 'End-to-end lead capture, qualification, and initial contact workflow',
  category: 'pre-service',
  estimatedDurationMs: 5000,
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

// ============================================================================
// QUOTE TO JOB PATTERNS
// ============================================================================

export const QUOTE_TO_JOB: MultiStepPattern = {
  id: 'quote_to_job',
  name: 'Convert Quote to Scheduled Job',
  description: 'End-to-end workflow from approved quote to scheduled, assigned job',
  category: 'pre-service',
  estimatedDurationMs: 8000,
  steps: [
    {
      order: 1,
      tool: 'get_quote',
      description: 'Fetch approved quote details',
      inputMapping: { quote_id: '{{input.quote_id}}' },
      outputKey: 'quote',
    },
    {
      order: 2,
      tool: 'create_job',
      description: 'Create job from quote',
      inputMapping: {
        quote_id: '{{quote.id}}',
        customer_id: '{{quote.customer_id}}',
        title: '{{quote.title}}',
        address: '{{quote.address}}',
      },
      outputKey: 'new_job',
    },
    {
      order: 3,
      tool: 'schedule_job',
      description: 'Schedule the job for a specific date/time',
      inputMapping: {
        job_id: '{{new_job.id}}',
        starts_at: '{{input.starts_at}}',
        ends_at: '{{input.ends_at}}',
      },
      outputKey: 'scheduled_job',
    },
    {
      order: 4,
      tool: 'assign_job',
      description: 'Assign team member to job',
      inputMapping: {
        job_id: '{{new_job.id}}',
        user_id: '{{input.assigned_to}}',
      },
      outputKey: 'assignment',
      optional: true,
    },
    {
      order: 5,
      tool: 'send_job_confirmation',
      description: 'Send confirmation email to customer',
      inputMapping: {
        job_id: '{{new_job.id}}',
      },
      outputKey: 'confirmation_sent',
      optional: true,
    },
  ],
  preconditions: [
    'Quote must exist and be in Approved status',
    'Customer must exist',
    'Schedule time must be in the future',
  ],
  postconditions: [
    'Job exists with status Scheduled',
    'Job has starts_at and ends_at set',
    'Quote status updated to converted',
  ],
  successMetrics: [
    'job_created',
    'job_scheduled',
    'job_assigned',
    'customer_notified',
  ],
};

// ============================================================================
// JOB COMPLETION PATTERNS
// ============================================================================

export const JOB_TO_INVOICE: MultiStepPattern = {
  id: 'job_to_invoice',
  name: 'Complete Job and Create Invoice',
  description: 'Mark job complete, generate invoice, and send to customer',
  category: 'post-service',
  estimatedDurationMs: 6000,
  steps: [
    {
      order: 1,
      tool: 'complete_job',
      description: 'Mark job as completed',
      inputMapping: { job_id: '{{input.job_id}}' },
      outputKey: 'completed_job',
    },
    {
      order: 2,
      tool: 'create_invoice',
      description: 'Create invoice from job',
      inputMapping: {
        job_id: '{{completed_job.id}}',
        customer_id: '{{completed_job.customer_id}}',
      },
      outputKey: 'new_invoice',
    },
    {
      order: 3,
      tool: 'send_invoice',
      description: 'Send invoice to customer',
      inputMapping: {
        invoice_id: '{{new_invoice.id}}',
      },
      outputKey: 'invoice_sent',
      optional: true,
    },
    {
      order: 4,
      tool: 'request_review',
      description: 'Request a review from the customer',
      inputMapping: {
        customer_id: '{{completed_job.customer_id}}',
        job_id: '{{completed_job.id}}',
      },
      outputKey: 'review_requested',
      optional: true,
    },
  ],
  preconditions: [
    'Job must exist and be in In Progress status',
    'Job must have at least one completed task or checklist',
  ],
  postconditions: [
    'Job status is Completed',
    'Invoice exists in Draft or Sent status',
  ],
  successMetrics: [
    'job_completed',
    'invoice_created',
    'invoice_sent',
    'review_requested',
  ],
};

// ============================================================================
// SITE ASSESSMENT PATTERNS
// ============================================================================

export const COMPLETE_SITE_ASSESSMENT: MultiStepPattern = {
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

// ============================================================================
// PATTERN REGISTRY
// ============================================================================

export const MULTI_STEP_PATTERNS: Record<string, MultiStepPattern> = {
  complete_lead_generation: COMPLETE_LEAD_GENERATION,
  quote_to_job: QUOTE_TO_JOB,
  job_to_invoice: JOB_TO_INVOICE,
  complete_site_assessment: COMPLETE_SITE_ASSESSMENT,
};

/**
 * Get a pattern by ID
 */
export function getPattern(patternId: string): MultiStepPattern | undefined {
  return MULTI_STEP_PATTERNS[patternId];
}

/**
 * Get all patterns for a category
 */
export function getPatternsByCategory(category: MultiStepPattern['category']): MultiStepPattern[] {
  return Object.values(MULTI_STEP_PATTERNS).filter(p => p.category === category);
}

/**
 * Validate pattern input has required fields
 */
export function validatePatternInput(
  pattern: MultiStepPattern,
  input: Record<string, any>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // Extract required inputs from first non-optional step's inputMapping
  const requiredStep = pattern.steps.find(s => !s.optional && !s.skipIf);
  if (!requiredStep) {
    return { valid: true, missing: [] };
  }
  
  for (const [key, ref] of Object.entries(requiredStep.inputMapping)) {
    const inputKey = (ref as string).match(/\{\{input\.(\w+)\}\}/)?.[1];
    if (inputKey && !input[inputKey]) {
      missing.push(inputKey);
    }
  }
  
  return { valid: missing.length === 0, missing };
}

/**
 * Resolve template references in a string
 */
export function resolveTemplateValue(
  template: string,
  context: {
    input: Record<string, any>;
    results: Record<string, any>;
    context: Record<string, any>;
  }
): any {
  const match = template.match(/\{\{(\w+)\.(\w+(?:\.\w+)*)\}\}/);
  if (!match) return template;
  
  const [, source, path] = match;
  const sourceObj = source === 'input' ? context.input
    : source === 'context' ? context.context
    : context.results[source];
  
  if (!sourceObj) return undefined;
  
  return path.split('.').reduce((obj, key) => obj?.[key], sourceObj);
}

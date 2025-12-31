/**
 * Tool Contracts - Pre/Post conditions and invariants for AI agent tools
 * Used by the step verifier to ensure correctness during workflow execution
 */

export interface Assertion {
  id: string;
  description: string;
  type: 'entity_exists' | 'field_equals' | 'field_not_null' | 'field_changed' | 'count_equals' | 'custom';
  entity?: string;
  field?: string;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_null' | 'changed';
  value?: any;
  fromArg?: string;  // Reference to tool argument for dynamic values
  customCheck?: string;  // For complex assertions
}

export interface DatabaseAssertion {
  id: string;
  description: string;
  table: string;
  query: {
    select: string;
    where: Record<string, string>;  // Field -> arg reference or literal
  };
  expect: {
    count?: number;
    field?: string;
    operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'not_null';
    value?: any;
  };
}

export interface ToolContract {
  toolName: string;
  description: string;
  
  // Pre-conditions (checked before execution)
  preconditions: Assertion[];
  
  // Post-conditions (checked after execution)
  postconditions: Assertion[];
  
  // Invariants (always true, checked before AND after)
  invariants: Assertion[];
  
  // Database assertions for verification
  dbAssertions: DatabaseAssertion[];
  
  // Rollback configuration
  rollbackTool?: string;
  rollbackArgs?: Record<string, string>;  // Maps result fields to rollback args
  
  // Process and sub-step this tool belongs to
  processId: string;
  subStepId: string;
}

// ============================================================================
// QUOTING/ESTIMATING TOOL CONTRACTS
// ============================================================================

export const CREATE_QUOTE_CONTRACT: ToolContract = {
  toolName: 'create_quote',
  description: 'Create a new quote for a customer',
  processId: 'quoting_estimating',
  subStepId: 'generate_quote',
  
  preconditions: [
    {
      id: 'customer_exists',
      description: 'Customer must exist',
      type: 'entity_exists',
      entity: 'customer',
      field: 'id',
      fromArg: 'customer_id'
    }
  ],
  
  postconditions: [
    {
      id: 'quote_created',
      description: 'Quote was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    },
    {
      id: 'quote_status_draft',
      description: 'New quote status is Draft',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Draft'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'quote_in_db',
      description: 'Quote exists in database',
      table: 'quotes',
      query: {
        select: 'id, status, customer_id',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_quote',
  rollbackArgs: { quote_id: 'result.id' }
};

export const UPDATE_QUOTE_CONTRACT: ToolContract = {
  toolName: 'update_quote',
  description: 'Update an existing quote',
  processId: 'quoting_estimating',
  subStepId: 'calculate_costs',
  
  preconditions: [
    {
      id: 'quote_exists',
      description: 'Quote must exist',
      type: 'entity_exists',
      entity: 'quote',
      field: 'id',
      fromArg: 'quote_id'
    },
    {
      id: 'quote_not_approved',
      description: 'Quote must not be already approved',
      type: 'field_not_null',
      entity: 'quote',
      field: 'status',
      operator: '!=',
      value: 'Approved'
    }
  ],
  
  postconditions: [
    {
      id: 'quote_updated',
      description: 'Quote was updated successfully',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [
    {
      id: 'customer_unchanged',
      description: 'Customer ID should not change',
      type: 'field_equals',
      entity: 'quote',
      field: 'customer_id',
      fromArg: 'original_customer_id'
    }
  ],
  
  dbAssertions: [
    {
      id: 'quote_updated_in_db',
      description: 'Quote updated in database',
      table: 'quotes',
      query: {
        select: 'id, updated_at',
        where: { id: 'args.quote_id' }
      },
      expect: {
        field: 'updated_at',
        operator: 'not_null'
      }
    }
  ]
};

export const APPROVE_QUOTE_CONTRACT: ToolContract = {
  toolName: 'approve_quote',
  description: 'Approve a quote, changing its status to Approved',
  processId: 'quoting_estimating',
  subStepId: 'negotiate_revise',
  
  preconditions: [
    {
      id: 'quote_exists',
      description: 'Quote must exist',
      type: 'entity_exists',
      entity: 'quote',
      field: 'id',
      fromArg: 'quote_id'
    },
    {
      id: 'quote_has_lines',
      description: 'Quote must have at least one line item',
      type: 'custom',
      customCheck: 'quote.line_items.length > 0'
    },
    {
      id: 'quote_status_valid',
      description: 'Quote status must be Draft or Sent',
      type: 'field_equals',
      entity: 'quote',
      field: 'status',
      operator: 'in',
      value: ['Draft', 'Sent']
    }
  ],
  
  postconditions: [
    {
      id: 'quote_approved',
      description: 'Quote status changed to Approved',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Approved'
    }
  ],
  
  invariants: [
    {
      id: 'total_unchanged',
      description: 'Quote total should not change during approval',
      type: 'field_equals',
      entity: 'quote',
      field: 'total',
      fromArg: 'original_total'
    }
  ],
  
  dbAssertions: [
    {
      id: 'quote_approved_in_db',
      description: 'Quote status is Approved in database',
      table: 'quotes',
      query: {
        select: 'id, status',
        where: { id: 'args.quote_id' }
      },
      expect: {
        field: 'status',
        operator: '==',
        value: 'Approved'
      }
    }
  ],
  
  // Cannot easily rollback an approval
  rollbackTool: 'update_quote',
  rollbackArgs: { quote_id: 'args.quote_id', status: 'Draft' }
};

export const SEND_QUOTE_CONTRACT: ToolContract = {
  toolName: 'send_quote',
  description: 'Send a quote to the customer via email',
  processId: 'quoting_estimating',
  subStepId: 'generate_quote',
  
  preconditions: [
    {
      id: 'quote_exists',
      description: 'Quote must exist',
      type: 'entity_exists',
      entity: 'quote',
      field: 'id',
      fromArg: 'quote_id'
    },
    {
      id: 'customer_has_email',
      description: 'Customer must have an email address',
      type: 'field_not_null',
      entity: 'customer',
      field: 'email'
    }
  ],
  
  postconditions: [
    {
      id: 'quote_sent',
      description: 'Quote status changed to Sent',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Sent'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'mail_send_logged',
      description: 'Email send was logged',
      table: 'mail_sends',
      query: {
        select: 'id, quote_id, status',
        where: { quote_id: 'args.quote_id' }
      },
      expect: {
        count: 1
      }
    }
  ]
};

// ============================================================================
// SCHEDULING TOOL CONTRACTS
// ============================================================================

export const CREATE_JOB_CONTRACT: ToolContract = {
  toolName: 'create_job',
  description: 'Create a new job/work order',
  processId: 'scheduling',
  subStepId: 'schedule_appointment',
  
  preconditions: [
    {
      id: 'customer_exists',
      description: 'Customer must exist',
      type: 'entity_exists',
      entity: 'customer',
      field: 'id',
      fromArg: 'customer_id'
    }
  ],
  
  postconditions: [
    {
      id: 'job_created',
      description: 'Job was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    },
    {
      id: 'job_status_pending',
      description: 'New job status is Pending',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Pending'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'job_in_db',
      description: 'Job exists in database',
      table: 'jobs',
      query: {
        select: 'id, status, customer_id',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_job',
  rollbackArgs: { job_id: 'result.id' }
};

export const SCHEDULE_JOB_CONTRACT: ToolContract = {
  toolName: 'schedule_job',
  description: 'Schedule a job for a specific date/time',
  processId: 'scheduling',
  subStepId: 'schedule_appointment',
  
  preconditions: [
    {
      id: 'job_exists',
      description: 'Job must exist',
      type: 'entity_exists',
      entity: 'job',
      field: 'id',
      fromArg: 'job_id'
    },
    {
      id: 'job_not_completed',
      description: 'Job must not be completed',
      type: 'field_not_null',
      entity: 'job',
      field: 'status',
      operator: '!=',
      value: 'Completed'
    }
  ],
  
  postconditions: [
    {
      id: 'job_scheduled',
      description: 'Job has starts_at set',
      type: 'field_not_null',
      entity: 'result',
      field: 'starts_at'
    },
    {
      id: 'job_status_scheduled',
      description: 'Job status is Scheduled',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Scheduled'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'job_scheduled_in_db',
      description: 'Job is scheduled in database',
      table: 'jobs',
      query: {
        select: 'id, status, starts_at',
        where: { id: 'args.job_id' }
      },
      expect: {
        field: 'starts_at',
        operator: 'not_null'
      }
    }
  ]
};

export const ASSIGN_JOB_CONTRACT: ToolContract = {
  toolName: 'assign_job',
  description: 'Assign a team member to a job',
  processId: 'dispatching',
  subStepId: 'assign_technician',
  
  preconditions: [
    {
      id: 'job_exists',
      description: 'Job must exist',
      type: 'entity_exists',
      entity: 'job',
      field: 'id',
      fromArg: 'job_id'
    },
    {
      id: 'team_member_exists',
      description: 'Team member must exist',
      type: 'entity_exists',
      entity: 'team_member',
      field: 'id',
      fromArg: 'user_id'
    }
  ],
  
  postconditions: [
    {
      id: 'assignment_created',
      description: 'Job assignment was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'assignment_in_db',
      description: 'Job assignment exists in database',
      table: 'job_assignments',
      query: {
        select: 'id, job_id, user_id',
        where: { job_id: 'args.job_id', user_id: 'args.user_id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'unassign_job',
  rollbackArgs: { job_id: 'args.job_id', user_id: 'args.user_id' }
};

// ============================================================================
// CUSTOMER COMMUNICATION TOOL CONTRACTS
// ============================================================================

export const SEND_JOB_CONFIRMATION_CONTRACT: ToolContract = {
  toolName: 'send_job_confirmation',
  description: 'Send job confirmation to customer',
  processId: 'customer_communication',
  subStepId: 'communicate_details',
  
  preconditions: [
    {
      id: 'job_exists',
      description: 'Job must exist',
      type: 'entity_exists',
      entity: 'job',
      field: 'id',
      fromArg: 'job_id'
    },
    {
      id: 'job_scheduled',
      description: 'Job must have a scheduled time',
      type: 'field_not_null',
      entity: 'job',
      field: 'starts_at'
    },
    {
      id: 'customer_has_email',
      description: 'Customer must have an email address',
      type: 'field_not_null',
      entity: 'customer',
      field: 'email'
    }
  ],
  
  postconditions: [
    {
      id: 'confirmation_sent',
      description: 'Confirmation was sent',
      type: 'field_equals',
      entity: 'result',
      field: 'sent',
      value: true
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'mail_send_logged',
      description: 'Email send was logged',
      table: 'mail_sends',
      query: {
        select: 'id, job_id, status',
        where: { job_id: 'args.job_id' }
      },
      expect: {
        count: 1
      }
    }
  ]
};

// ============================================================================
// TOOL CONTRACT REGISTRY
// ============================================================================

export const TOOL_CONTRACTS: Record<string, ToolContract> = {
  create_quote: CREATE_QUOTE_CONTRACT,
  update_quote: UPDATE_QUOTE_CONTRACT,
  approve_quote: APPROVE_QUOTE_CONTRACT,
  send_quote: SEND_QUOTE_CONTRACT,
  create_job: CREATE_JOB_CONTRACT,
  schedule_job: SCHEDULE_JOB_CONTRACT,
  assign_job: ASSIGN_JOB_CONTRACT,
  send_job_confirmation: SEND_JOB_CONFIRMATION_CONTRACT
};

/**
 * Get contract for a tool
 */
export function getToolContract(toolName: string): ToolContract | null {
  return TOOL_CONTRACTS[toolName] || null;
}

/**
 * Get all contracts for a process
 */
export function getProcessContracts(processId: string): ToolContract[] {
  return Object.values(TOOL_CONTRACTS).filter(c => c.processId === processId);
}

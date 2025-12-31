/**
 * Process Registry - Maps the 15 Universal Processes to their constituent tools
 * Starting with the 4 processes needed for Quote-to-Job workflow
 */

export interface SubStep {
  id: string;
  name: string;
  description: string;
  tools: string[];  // Tools that can accomplish this sub-step
}

export interface Condition {
  type: 'db_check' | 'context_check' | 'entity_exists' | 'status_equals';
  entity?: string;
  field?: string;
  operator?: '==' | '!=' | '>' | '<' | 'in' | 'not_null';
  value?: any;
  query?: string;  // For complex db_check conditions
}

export interface ProcessDefinition {
  id: string;
  name: string;
  description: string;
  subSteps: SubStep[];
  tools: string[];  // All tools that implement this process
  inputContract: Record<string, string>;  // Required inputs with types
  outputContract: Record<string, string>; // Expected outputs with types
  entryConditions: Condition[];
  exitConditions: Condition[];
  userCheckpoints?: string[];  // Points where user approval is required
}

// ============================================================================
// PROCESS DEFINITIONS (4 of 15 for Quote-to-Job workflow)
// ============================================================================

export const QUOTING_ESTIMATING: ProcessDefinition = {
  id: 'quoting_estimating',
  name: 'Quoting/Estimating',
  description: 'Create and manage quotes for customers, from initial request through approval',
  subSteps: [
    {
      id: 'receive_request',
      name: 'Receive Service Request',
      description: 'Capture customer request details and requirements',
      tools: ['create_request', 'get_customer']
    },
    {
      id: 'site_assessment',
      name: 'Conduct Site Visit & Assessment',
      description: 'Evaluate job requirements, conditions, and constraints',
      tools: ['create_job', 'update_job']  // Assessment jobs
    },
    {
      id: 'design_solution',
      name: 'Design Solution & Select Materials',
      description: 'Plan the service approach and identify required materials',
      tools: ['get_inventory', 'create_quote_line_item']
    },
    {
      id: 'calculate_costs',
      name: 'Calculate Costs & Markup',
      description: 'Compute total costs including labor, materials, and margin',
      tools: ['update_quote', 'create_quote_line_item', 'update_quote_line_item']
    },
    {
      id: 'generate_quote',
      name: 'Generate & Present Quote',
      description: 'Create the formal quote document and send to customer',
      tools: ['create_quote', 'send_quote']
    },
    {
      id: 'negotiate_revise',
      name: 'Negotiate & Revise',
      description: 'Handle customer feedback and revise quote if needed',
      tools: ['update_quote', 'update_quote_line_item', 'approve_quote']
    }
  ],
  tools: [
    'create_quote',
    'update_quote',
    'get_quote',
    'list_quotes',
    'send_quote',
    'approve_quote',
    'create_quote_line_item',
    'update_quote_line_item',
    'delete_quote_line_item'
  ],
  inputContract: {
    customer_id: 'uuid',
    service_description: 'string',
    address: 'string?'
  },
  outputContract: {
    quote_id: 'uuid',
    quote_status: 'QuoteStatus',
    total: 'number',
    line_items: 'QuoteLineItem[]'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  exitConditions: [
    { type: 'entity_exists', entity: 'quote', field: 'id' },
    { type: 'status_equals', entity: 'quote', field: 'status', value: 'Approved' }
  ],
  userCheckpoints: ['quote_approval']
};

export const SCHEDULING: ProcessDefinition = {
  id: 'scheduling',
  name: 'Scheduling',
  description: 'Schedule jobs based on availability, skills, and customer preferences',
  subSteps: [
    {
      id: 'receive_request',
      name: 'Receive service request',
      description: 'Get the approved quote or work order for scheduling',
      tools: ['get_quote', 'get_job']
    },
    {
      id: 'check_availability',
      name: 'Check technician availability',
      description: 'Query team calendar and existing commitments',
      tools: ['list_team_members', 'get_team_availability']
    },
    {
      id: 'match_skills',
      name: 'Match technician skills to job',
      description: 'Find qualified team members for the job type',
      tools: ['list_team_members', 'get_team_member']
    },
    {
      id: 'schedule_appointment',
      name: 'Schedule appointment',
      description: 'Create the job with assigned time slot',
      tools: ['create_job', 'update_job', 'schedule_job']
    },
    {
      id: 'send_confirmation',
      name: 'Send confirmation to customer',
      description: 'Notify customer of scheduled appointment',
      tools: ['send_job_confirmation']
    },
    {
      id: 'sync_calendar',
      name: 'Sync with team calendar',
      description: 'Update team calendars with new job',
      tools: ['assign_job']
    }
  ],
  tools: [
    'create_job',
    'update_job',
    'schedule_job',
    'get_job',
    'list_jobs',
    'assign_job',
    'list_team_members',
    'get_team_availability',
    'send_job_confirmation'
  ],
  inputContract: {
    quote_id: 'uuid?',
    customer_id: 'uuid',
    service_type: 'string',
    preferred_date: 'string?',
    preferred_time: 'string?'
  },
  outputContract: {
    job_id: 'uuid',
    job_status: 'JobStatus',
    starts_at: 'timestamp',
    ends_at: 'timestamp',
    assigned_team: 'uuid[]'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  exitConditions: [
    { type: 'entity_exists', entity: 'job', field: 'id' },
    { type: 'context_check', field: 'job.starts_at', operator: 'not_null' }
  ],
  userCheckpoints: ['schedule_confirmation']
};

export const DISPATCHING: ProcessDefinition = {
  id: 'dispatching',
  name: 'Dispatching',
  description: 'Assign and dispatch technicians to scheduled jobs',
  subSteps: [
    {
      id: 'receive_request',
      name: 'Receive Service Request',
      description: 'Get scheduled job ready for dispatch',
      tools: ['get_job', 'list_jobs']
    },
    {
      id: 'verify_details',
      name: 'Verify Customer and Service Details',
      description: 'Confirm all job details are complete',
      tools: ['get_job', 'get_customer', 'get_quote']
    },
    {
      id: 'identify_requirements',
      name: 'Identify Required Skills and Parts',
      description: 'Ensure technician qualifications and inventory',
      tools: ['list_team_members', 'get_inventory']
    },
    {
      id: 'assign_technician',
      name: 'Assign Technician and Schedule',
      description: 'Assign specific team member(s) to the job',
      tools: ['assign_job', 'update_job']
    },
    {
      id: 'confirm_appointment',
      name: 'Confirm Appointment with Customer',
      description: 'Send day-of or reminder confirmation',
      tools: ['send_job_confirmation']
    },
    {
      id: 'dispatch',
      name: 'Dispatch Technician',
      description: 'Release job to assigned technician',
      tools: ['update_job']  // Set status to 'In Progress' or similar
    }
  ],
  tools: [
    'get_job',
    'list_jobs',
    'update_job',
    'assign_job',
    'unassign_job',
    'list_team_members',
    'get_team_member',
    'send_job_confirmation'
  ],
  inputContract: {
    job_id: 'uuid',
    team_member_id: 'uuid?'
  },
  outputContract: {
    job_id: 'uuid',
    job_status: 'JobStatus',
    assigned_team: 'uuid[]',
    dispatch_confirmed: 'boolean'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'job', field: 'id' },
    { type: 'context_check', field: 'job.starts_at', operator: 'not_null' }
  ],
  exitConditions: [
    { type: 'status_equals', entity: 'job', field: 'status', value: 'Scheduled' },
    { type: 'context_check', field: 'job.assigned_team.length', operator: '>', value: 0 }
  ],
  userCheckpoints: []
};

export const CUSTOMER_COMMUNICATION: ProcessDefinition = {
  id: 'customer_communication',
  name: 'Customer Communication',
  description: 'Manage all customer touchpoints throughout the service lifecycle',
  subSteps: [
    {
      id: 'receive_inquiry',
      name: 'Receive customer inquiry',
      description: 'Handle incoming customer contact',
      tools: ['create_request', 'get_customer']
    },
    {
      id: 'access_data',
      name: 'Access customer and service data',
      description: 'Retrieve relevant customer and job information',
      tools: ['get_customer', 'get_job', 'get_quote', 'list_jobs']
    },
    {
      id: 'communicate_details',
      name: 'Communicate service details/confirm appointment',
      description: 'Send appointment confirmations and service info',
      tools: ['send_job_confirmation', 'send_quote']
    },
    {
      id: 'realtime_updates',
      name: 'Provide real-time updates during service',
      description: 'Send on-the-way, arrival, and progress notifications',
      tools: ['update_job']  // Triggers automated notifications
    },
    {
      id: 'followup',
      name: 'Follow-up post-service',
      description: 'Send completion confirmation and request feedback',
      tools: ['send_invoice', 'update_job']
    }
  ],
  tools: [
    'send_quote',
    'send_invoice',
    'send_job_confirmation',
    'get_customer',
    'update_customer'
  ],
  inputContract: {
    customer_id: 'uuid',
    communication_type: 'string',
    entity_id: 'uuid?',  // quote_id, job_id, or invoice_id
    entity_type: 'string?'
  },
  outputContract: {
    sent: 'boolean',
    sent_at: 'timestamp?',
    delivery_status: 'string?'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  exitConditions: [
    { type: 'context_check', field: 'communication_sent', operator: '==', value: true }
  ],
  userCheckpoints: []
};

// ============================================================================
// PROCESS REGISTRY
// ============================================================================

export const PROCESS_REGISTRY: Record<string, ProcessDefinition> = {
  quoting_estimating: QUOTING_ESTIMATING,
  scheduling: SCHEDULING,
  dispatching: DISPATCHING,
  customer_communication: CUSTOMER_COMMUNICATION
};

/**
 * Get all tools associated with a process
 */
export function getProcessTools(processId: string): string[] {
  const process = PROCESS_REGISTRY[processId];
  return process ? process.tools : [];
}

/**
 * Find which process a tool belongs to
 */
export function getToolProcess(toolName: string): ProcessDefinition | null {
  for (const process of Object.values(PROCESS_REGISTRY)) {
    if (process.tools.includes(toolName)) {
      return process;
    }
  }
  return null;
}

/**
 * Get the sub-step a tool implements within a process
 */
export function getToolSubStep(processId: string, toolName: string): SubStep | null {
  const process = PROCESS_REGISTRY[processId];
  if (!process) return null;
  
  for (const subStep of process.subSteps) {
    if (subStep.tools.includes(toolName)) {
      return subStep;
    }
  }
  return null;
}

/**
 * Check if all entry conditions for a process are met
 */
export function checkEntryConditions(
  process: ProcessDefinition,
  context: Record<string, any>
): { passed: boolean; failedConditions: Condition[] } {
  const failedConditions: Condition[] = [];
  
  for (const condition of process.entryConditions) {
    if (!evaluateCondition(condition, context)) {
      failedConditions.push(condition);
    }
  }
  
  return {
    passed: failedConditions.length === 0,
    failedConditions
  };
}

/**
 * Check if all exit conditions for a process are met
 */
export function checkExitConditions(
  process: ProcessDefinition,
  context: Record<string, any>
): { passed: boolean; failedConditions: Condition[] } {
  const failedConditions: Condition[] = [];
  
  for (const condition of process.exitConditions) {
    if (!evaluateCondition(condition, context)) {
      failedConditions.push(condition);
    }
  }
  
  return {
    passed: failedConditions.length === 0,
    failedConditions
  };
}

/**
 * Evaluate a single condition against context
 */
function evaluateCondition(condition: Condition, context: Record<string, any>): boolean {
  switch (condition.type) {
    case 'entity_exists':
      return context[condition.entity!]?.[condition.field!] != null;
      
    case 'context_check': {
      const value = getNestedValue(context, condition.field!);
      return compareValues(value, condition.operator!, condition.value);
    }
    
    case 'status_equals': {
      const entity = context[condition.entity!];
      return entity?.[condition.field!] === condition.value;
    }
    
    case 'db_check':
      // DB checks are handled by the step verifier at runtime
      return true;
      
    default:
      return false;
  }
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

function compareValues(actual: any, operator: string, expected: any): boolean {
  switch (operator) {
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    case '>': return actual > expected;
    case '<': return actual < expected;
    case 'in': return Array.isArray(expected) && expected.includes(actual);
    case 'not_null': return actual != null;
    default: return false;
  }
}

/**
 * Step Verifier for Multi-Step Planner
 * 
 * Provides runtime verification of tool execution against defined contracts:
 * - Precondition checks before execution
 * - Postcondition checks after execution
 * - Invariant verification (before AND after)
 * - Database assertion validation
 * - Rollback on verification failure
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Assertion {
  type: 'entity_exists' | 'field_equals' | 'field_not_equals' | 'count_equals' | 'count_greater_than';
  entity?: string;
  entityId?: string;
  field?: string;
  value?: any;
  count?: number;
  description: string;
}

export interface DatabaseAssertion {
  query: string;
  params?: Record<string, any>;
  expect: {
    rowCount?: number;
    operator?: 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
    field?: string;
    value?: any;
  };
  description: string;
}

export interface ToolContract {
  toolName: string;
  processId: string;
  subStep: string;
  preconditions: Assertion[];
  postconditions: Assertion[];
  invariants: Assertion[];
  dbAssertions: DatabaseAssertion[];
  rollbackTool?: string;
  rollbackArgs?: (result: any) => Record<string, any>;
}

export interface VerificationResult {
  passed: boolean;
  phase: 'precondition' | 'postcondition' | 'invariant' | 'db_assertion';
  failedAssertions: FailedAssertion[];
  executionTimeMs?: number;
}

export interface FailedAssertion {
  assertionId: string;
  description: string;
  expected: any;
  actual: any;
}

export interface StepExecutionContext {
  businessId: string;
  userId: string;
  args: Record<string, any>;
  entities: Record<string, any>;
  previousResults: Record<string, any>;
}

export interface VerifiedStepResult {
  status: 'completed' | 'failed' | 'rolled_back';
  result?: any;
  error?: string;
  verification: VerificationResult;
  recoverySuggestion?: string;
}

// =============================================================================
// TOOL CONTRACTS (Inline for Edge Function)
// =============================================================================

const TOOL_CONTRACTS: Record<string, ToolContract> = {
  // Quoting/Estimating tools
  create_quote: {
    toolName: 'create_quote',
    processId: 'quoting_estimating',
    subStep: 'Create Estimate',
    preconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'customerId', description: 'Customer must exist' },
    ],
    postconditions: [
      { type: 'field_equals', entity: 'quote', field: 'status', value: 'Draft', description: 'Quote should be in Draft status' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM quotes WHERE id = $1',
        params: { '$1': 'result.quote_id' },
        expect: { rowCount: 1 },
        description: 'Quote should exist in database',
      },
    ],
    rollbackTool: 'delete_quote',
    rollbackArgs: (result) => ({ quoteId: result.quote_id }),
  },

  update_quote: {
    toolName: 'update_quote',
    processId: 'quoting_estimating',
    subStep: 'Revise/Adjust Pricing',
    preconditions: [
      { type: 'entity_exists', entity: 'quote', entityId: 'quoteId', description: 'Quote must exist' },
      { type: 'field_not_equals', entity: 'quote', field: 'status', value: 'Approved', description: 'Quote must not be approved' },
    ],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  approve_quote: {
    toolName: 'approve_quote',
    processId: 'quoting_estimating',
    subStep: 'Present & Approve',
    preconditions: [
      { type: 'entity_exists', entity: 'quote', entityId: 'quoteId', description: 'Quote must exist' },
      { type: 'field_not_equals', entity: 'quote', field: 'status', value: 'Approved', description: 'Quote must not already be approved' },
    ],
    postconditions: [
      { type: 'field_equals', entity: 'quote', field: 'status', value: 'Approved', description: 'Quote status should be Approved' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT status FROM quotes WHERE id = $1',
        params: { '$1': 'args.quoteId' },
        expect: { field: 'status', value: 'Approved' },
        description: 'Quote status must be Approved in database',
      },
    ],
    rollbackTool: 'update_quote_status',
    rollbackArgs: (result) => ({ quoteId: result.quote_id, status: 'Draft' }),
  },

  send_quote: {
    toolName: 'send_quote',
    processId: 'quoting_estimating',
    subStep: 'Present & Approve',
    preconditions: [
      { type: 'entity_exists', entity: 'quote', entityId: 'quoteId', description: 'Quote must exist' },
    ],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  convert_quote_to_job: {
    toolName: 'convert_quote_to_job',
    processId: 'quoting_estimating',
    subStep: 'Convert to Work Order',
    preconditions: [
      { type: 'entity_exists', entity: 'quote', entityId: 'quoteId', description: 'Quote must exist' },
      { type: 'field_equals', entity: 'quote', field: 'status', value: 'Approved', description: 'Quote must be approved before conversion' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'job', entityId: 'result.job_id', description: 'Job should be created' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM jobs WHERE quote_id = $1',
        params: { '$1': 'args.quoteId' },
        expect: { rowCount: 1, operator: 'gte' },
        description: 'At least one job should be linked to this quote',
      },
    ],
    rollbackTool: 'delete_job',
    rollbackArgs: (result) => ({ jobId: result.job_id }),
  },

  // Scheduling tools
  create_job: {
    toolName: 'create_job',
    processId: 'scheduling',
    subStep: 'Queue Job',
    preconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'customerId', description: 'Customer must exist' },
    ],
    postconditions: [
      { type: 'field_equals', entity: 'job', field: 'status', value: 'Pending', description: 'Job should be in Pending status' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM jobs WHERE id = $1',
        params: { '$1': 'result.job_id' },
        expect: { rowCount: 1 },
        description: 'Job should exist in database',
      },
    ],
    rollbackTool: 'delete_job',
    rollbackArgs: (result) => ({ jobId: result.job_id }),
  },

  auto_schedule_job: {
    toolName: 'auto_schedule_job',
    processId: 'scheduling',
    subStep: 'Schedule on Calendar',
    preconditions: [
      { type: 'entity_exists', entity: 'job', entityId: 'jobId', description: 'Job must exist' },
      { type: 'field_equals', entity: 'job', field: 'status', value: 'Pending', description: 'Job must be pending' },
    ],
    postconditions: [
      { type: 'field_equals', entity: 'job', field: 'status', value: 'Scheduled', description: 'Job should be scheduled' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT starts_at FROM jobs WHERE id = $1',
        params: { '$1': 'args.jobId' },
        expect: { field: 'starts_at', value: 'NOT_NULL' },
        description: 'Job should have a scheduled start time',
      },
    ],
    rollbackTool: 'unschedule_job',
    rollbackArgs: (result) => ({ jobId: result.job_id }),
  },

  // Dispatching tools
  assign_job_to_member: {
    toolName: 'assign_job_to_member',
    processId: 'dispatching',
    subStep: 'Assign Tech/Crew',
    preconditions: [
      { type: 'entity_exists', entity: 'job', entityId: 'jobId', description: 'Job must exist' },
      { type: 'entity_exists', entity: 'user', entityId: 'userId', description: 'User must exist' },
    ],
    postconditions: [],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM job_assignments WHERE job_id = $1 AND user_id = $2',
        params: { '$1': 'args.jobId', '$2': 'args.userId' },
        expect: { rowCount: 1, operator: 'gte' },
        description: 'Assignment should exist',
      },
    ],
    rollbackTool: 'unassign_job',
    rollbackArgs: (result) => ({ jobId: result.job_id, userId: result.user_id }),
  },

  // Customer Communication tools
  send_job_confirmation: {
    toolName: 'send_job_confirmation',
    processId: 'customer_communication',
    subStep: 'Send Confirmation',
    preconditions: [
      { type: 'entity_exists', entity: 'job', entityId: 'jobId', description: 'Job must exist' },
      { type: 'field_equals', entity: 'job', field: 'status', value: 'Scheduled', description: 'Job must be scheduled' },
    ],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  send_invoice: {
    toolName: 'send_invoice',
    processId: 'customer_communication',
    subStep: 'Send Invoice',
    preconditions: [
      { type: 'entity_exists', entity: 'invoice', entityId: 'invoiceId', description: 'Invoice must exist' },
    ],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  // ==========================================================================
  // LEAD GENERATION TOOL CONTRACTS
  // ==========================================================================

  create_customer: {
    toolName: 'create_customer',
    processId: 'lead_generation',
    subStep: 'Receive Inquiry',
    preconditions: [
      { type: 'field_not_equals', entity: 'args', field: 'email', value: null, description: 'Email is required' },
      { type: 'field_not_equals', entity: 'args', field: 'name', value: null, description: 'Name is required' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'result.customer_id', description: 'Customer should be created' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM customers WHERE id = $1',
        params: { '$1': 'result.customer_id' },
        expect: { rowCount: 1 },
        description: 'Customer exists in database',
      },
    ],
    rollbackTool: 'delete_customer',
    rollbackArgs: (result) => ({ customerId: result.customer_id }),
  },

  search_customers: {
    toolName: 'search_customers',
    processId: 'lead_generation',
    subStep: 'Receive Inquiry',
    preconditions: [],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  get_customer: {
    toolName: 'get_customer',
    processId: 'lead_generation',
    subStep: 'Qualify Lead',
    preconditions: [
      { type: 'field_not_equals', entity: 'args', field: 'customerId', value: null, description: 'Customer ID is required' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'result.customer.id', description: 'Customer should be returned' },
    ],
    invariants: [],
    dbAssertions: [],
  },

  update_customer: {
    toolName: 'update_customer',
    processId: 'lead_generation',
    subStep: 'Qualify Lead',
    preconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'customerId', description: 'Customer must exist' },
    ],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  create_request: {
    toolName: 'create_request',
    processId: 'lead_generation',
    subStep: 'Enter into System',
    preconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'customerId', description: 'Customer must exist' },
      { type: 'field_not_equals', entity: 'args', field: 'title', value: null, description: 'Request title is required' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'request', entityId: 'result.request_id', description: 'Request should be created' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM requests WHERE id = $1',
        params: { '$1': 'result.request_id' },
        expect: { rowCount: 1 },
        description: 'Request exists in database',
      },
    ],
    rollbackTool: 'delete_request',
    rollbackArgs: (result) => ({ requestId: result.request_id }),
  },

  list_team_members: {
    toolName: 'list_team_members',
    processId: 'lead_generation',
    subStep: 'Assign Lead',
    preconditions: [],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  check_team_availability: {
    toolName: 'check_team_availability',
    processId: 'lead_generation',
    subStep: 'Assign Lead',
    preconditions: [],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  // ==========================================================================
  // LEAD GENERATION - NEW DFY TOOL CONTRACTS
  // ==========================================================================

  send_email: {
    toolName: 'send_email',
    processId: 'lead_generation',
    subStep: 'Initial Contact',
    preconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'customerId', description: 'Customer must exist' },
      { type: 'field_not_equals', entity: 'args', field: 'subject', value: '', description: 'Subject is required' },
      { type: 'field_not_equals', entity: 'args', field: 'body', value: '', description: 'Body is required' },
    ],
    postconditions: [
      { type: 'field_equals', entity: 'result', field: 'success', value: true, description: 'Email should be sent successfully' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM ai_activity_log WHERE metadata->>\'customerId\' = $1 AND activity_type = \'email_sent\'',
        params: { '$1': 'args.customerId' },
        expect: { rowCount: 1, operator: 'gte' },
        description: 'Email activity should be logged',
      },
    ],
  },

  score_lead: {
    toolName: 'score_lead',
    processId: 'lead_generation',
    subStep: 'Qualify Lead',
    preconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'customerId', description: 'Customer must exist' },
    ],
    postconditions: [
      { type: 'field_not_equals', entity: 'result', field: 'score', value: null, description: 'Score should be calculated' },
    ],
    invariants: [],
    dbAssertions: [],
  },

  qualify_lead: {
    toolName: 'qualify_lead',
    processId: 'lead_generation',
    subStep: 'Qualify Lead',
    preconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'customerId', description: 'Customer must exist' },
    ],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  auto_assign_lead: {
    toolName: 'auto_assign_lead',
    processId: 'lead_generation',
    subStep: 'Assign Lead',
    preconditions: [],
    postconditions: [
      { type: 'field_not_equals', entity: 'result', field: 'assignedTo', value: null, description: 'Lead should be assigned to a team member' },
    ],
    invariants: [],
    dbAssertions: [],
  },

  // ==========================================================================
  // CUSTOMER COMMUNICATION TOOL CONTRACTS
  // ==========================================================================

  create_conversation: {
    toolName: 'create_conversation',
    processId: 'communication',
    subStep: 'Receive Customer Inquiry',
    preconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'customerId', description: 'Customer must exist' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'conversation', entityId: 'result.conversation_id', description: 'Conversation should be created' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM sg_conversations WHERE id = $1',
        params: { '$1': 'result.conversation_id' },
        expect: { rowCount: 1 },
        description: 'Conversation exists in database',
      },
    ],
    rollbackTool: 'delete_conversation',
    rollbackArgs: (result) => ({ conversationId: result.conversation_id }),
  },

  get_or_create_conversation: {
    toolName: 'get_or_create_conversation',
    processId: 'communication',
    subStep: 'Receive Customer Inquiry',
    preconditions: [
      { type: 'entity_exists', entity: 'customer', entityId: 'customerId', description: 'Customer must exist' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'conversation', entityId: 'result.conversation_id', description: 'Conversation should exist' },
    ],
    invariants: [],
    dbAssertions: [],
  },

  get_conversation_details: {
    toolName: 'get_conversation_details',
    processId: 'communication',
    subStep: 'Access Customer & Service Data',
    preconditions: [
      { type: 'entity_exists', entity: 'conversation', entityId: 'conversationId', description: 'Conversation must exist' },
    ],
    postconditions: [],
    invariants: [],
    dbAssertions: [],
  },

  send_message: {
    toolName: 'send_message',
    processId: 'communication',
    subStep: 'Communicate Service Details',
    preconditions: [
      { type: 'entity_exists', entity: 'conversation', entityId: 'conversationId', description: 'Conversation must exist' },
      { type: 'field_not_equals', entity: 'args', field: 'content', value: '', description: 'Message content is required' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'message', entityId: 'result.message_id', description: 'Message should be created' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM sg_messages WHERE id = $1',
        params: { '$1': 'result.message_id' },
        expect: { rowCount: 1 },
        description: 'Message exists in database',
      },
    ],
    rollbackTool: 'delete_message',
    rollbackArgs: (result) => ({ messageId: result.message_id }),
  },

  send_status_update: {
    toolName: 'send_status_update',
    processId: 'communication',
    subStep: 'Real-Time Service Updates',
    preconditions: [
      { type: 'entity_exists', entity: 'job', entityId: 'jobId', description: 'Job must exist' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'message', entityId: 'result.message_id', description: 'Status update message should be created' },
    ],
    invariants: [],
    dbAssertions: [],
  },

  queue_email: {
    toolName: 'queue_email',
    processId: 'communication',
    subStep: 'Follow-Up Post-Service',
    preconditions: [
      { type: 'field_not_equals', entity: 'args', field: 'recipientEmail', value: '', description: 'Recipient email is required' },
      { type: 'field_not_equals', entity: 'args', field: 'emailType', value: '', description: 'Email type is required' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'email', entityId: 'result.email_id', description: 'Email should be queued' },
    ],
    invariants: [],
    dbAssertions: [
      {
        query: 'SELECT COUNT(*) as count FROM email_queue WHERE id = $1',
        params: { '$1': 'result.email_id' },
        expect: { rowCount: 1 },
        description: 'Email exists in queue',
      },
    ],
    rollbackTool: 'cancel_queued_email',
    rollbackArgs: (result) => ({ emailId: result.email_id }),
  },

  queue_followup_email: {
    toolName: 'queue_followup_email',
    processId: 'communication',
    subStep: 'Follow-Up Post-Service',
    preconditions: [
      { type: 'entity_exists', entity: 'job', entityId: 'jobId', description: 'Job must exist' },
      { type: 'field_equals', entity: 'job', field: 'status', value: 'Completed', description: 'Job must be completed' },
    ],
    postconditions: [
      { type: 'entity_exists', entity: 'email', entityId: 'result.email_id', description: 'Follow-up email should be queued' },
    ],
    invariants: [],
    dbAssertions: [],
    rollbackTool: 'cancel_queued_email',
    rollbackArgs: (result) => ({ emailId: result.email_id }),
  },
};

// =============================================================================
// PROCESS-LEVEL VERIFICATION CONTRACTS
// =============================================================================

interface ProcessContract {
  processId: string;
  entryConditions: Assertion[];
  exitConditions: Assertion[];
  requiredTools: string[];  // All tools that must complete for process success
  optionalTools: string[];  // Nice-to-have but not required
  checkpoints: string[];    // Sub-steps requiring user confirmation
}

const PROCESS_CONTRACTS: Record<string, ProcessContract> = {
  lead_generation: {
    processId: 'lead_generation',
    entryConditions: [],  // No preconditions - this is the entry point
    exitConditions: [
      { type: 'entity_exists', entity: 'customer', description: 'Customer record must exist' },
    ],
    requiredTools: ['create_customer'],  // Minimum required for process completion
    optionalTools: [
      'search_customers', 
      'create_request', 
      'list_team_members', 
      'check_team_availability', 
      'create_quote',
      'score_lead',        // NEW: Lead scoring
      'qualify_lead',      // NEW: Lead qualification
      'auto_assign_lead',  // NEW: Auto-assignment
      'send_email'         // NEW: Email communication
    ],
    checkpoints: ['qualify_lead', 'assign_lead'],  // Steps requiring user confirmation
  },
  quoting_estimating: {
    processId: 'quoting_estimating',
    entryConditions: [
      { type: 'entity_exists', entity: 'customer', description: 'Customer must exist to create quote' },
    ],
    exitConditions: [
      { type: 'entity_exists', entity: 'quote', description: 'Quote must exist' },
    ],
    requiredTools: ['create_quote'],
    optionalTools: ['update_quote', 'send_quote', 'approve_quote', 'convert_quote_to_job'],
    checkpoints: ['pricing_approval'],
  },
  scheduling: {
    processId: 'scheduling',
    entryConditions: [
      { type: 'entity_exists', entity: 'job', description: 'Job must exist to schedule' },
    ],
    exitConditions: [
      { type: 'field_not_equals', entity: 'job', field: 'starts_at', value: null, description: 'Job must have scheduled time' },
    ],
    requiredTools: ['auto_schedule_job'],
    optionalTools: ['batch_schedule_jobs', 'reschedule_job'],
    checkpoints: [],
  },
  communication: {
    processId: 'communication',
    entryConditions: [
      { type: 'entity_exists', entity: 'customer', description: 'Customer must exist to communicate' },
    ],
    exitConditions: [
      { type: 'entity_exists', entity: 'conversation', description: 'Conversation must exist' },
    ],
    requiredTools: ['get_or_create_conversation'],
    optionalTools: [
      'create_conversation',
      'get_conversation_details',
      'send_message',
      'send_email',
      'send_status_update',
      'queue_email',
      'queue_followup_email'
    ],
    checkpoints: ['send_message'],
  },
};

/**
 * Verify that a process has been completed successfully
 */
export function verifyProcessCompletion(
  processId: string,
  executedTools: string[],
  results: Record<string, any>
): { completed: boolean; missingSteps: string[]; message: string } {
  const contract = PROCESS_CONTRACTS[processId];
  if (!contract) {
    return { completed: true, missingSteps: [], message: 'No process contract defined' };
  }

  const missingTools = contract.requiredTools.filter(t => !executedTools.includes(t));

  return {
    completed: missingTools.length === 0,
    missingSteps: missingTools,
    message: missingTools.length > 0
      ? `Process incomplete. Missing required steps: ${missingTools.join(', ')}`
      : 'Process completed successfully'
  };
}

/**
 * Get the process contract for a given process ID
 */
export function getProcessContract(processId: string): ProcessContract | undefined {
  return PROCESS_CONTRACTS[processId];
}

// =============================================================================
// RECOVERY SUGGESTIONS
// =============================================================================

const RECOVERY_SUGGESTIONS: Record<string, Record<string, string>> = {
  // Quoting/Estimating
  approve_quote: {
    'Quote must exist': 'Please select a valid quote to approve.',
    'Quote must not already be approved': 'This quote is already approved. Would you like to create a job from it instead?',
    'Quote status should be Approved': 'The quote approval failed. Please try again or check the quote details.',
  },
  convert_quote_to_job: {
    'Quote must exist': 'Please select a valid quote to convert.',
    'Quote must be approved before conversion': 'Please approve the quote first before converting it to a job.',
    'Job should be created': 'Failed to create the job. Please try again or create the job manually.',
  },
  // Scheduling
  auto_schedule_job: {
    'Job must exist': 'Please select a valid job to schedule.',
    'Job must be pending': 'This job is already scheduled or in progress.',
    'Job should be scheduled': 'The scheduling failed. No available time slots found.',
  },
  // Dispatching
  assign_job_to_member: {
    'Job must exist': 'Please select a valid job to assign.',
    'User must exist': 'Please select a valid team member.',
    'Assignment should exist': 'Failed to assign the team member. Please try again.',
  },
  send_job_confirmation: {
    'Job must exist': 'Please select a valid job.',
    'Job must be scheduled': 'Please schedule the job first before sending a confirmation.',
  },
  // Lead Generation
  create_customer: {
    'Email is required': 'Please provide the customer email address.',
    'Name is required': 'Please provide the customer name.',
    'Customer should be created': 'Failed to create customer. Please check the details and try again.',
  },
  create_request: {
    'Customer must exist': 'Please create or select a customer first.',
    'Request title is required': 'Please provide a title for the service request.',
    'Request should be created': 'Failed to create the request. Please try again.',
  },
  get_customer: {
    'Customer ID is required': 'Please specify which customer to retrieve.',
    'Customer should be returned': 'Customer not found. Please check the customer ID.',
  },
  // Communication
  create_conversation: {
    'Customer must exist': 'Please create or select a customer first.',
    'Conversation should be created': 'Failed to create conversation. Please try again.',
  },
  get_or_create_conversation: {
    'Customer must exist': 'Please create or select a customer first.',
    'Conversation should exist': 'Failed to get or create conversation. Please try again.',
  },
  send_message: {
    'Conversation must exist': 'Please start a conversation first.',
    'Message content is required': 'Please provide message content.',
    'Message should be created': 'Failed to send message. Please try again.',
  },
  queue_email: {
    'Recipient email is required': 'Please provide a recipient email address.',
    'Email type is required': 'Please specify the email type.',
    'Email should be queued': 'Failed to queue email. Please try again.',
  },
  send_status_update: {
    'Job must exist': 'Please select a valid job first.',
    'Status update message should be created': 'Failed to send status update. Please try again.',
  },
  queue_followup_email: {
    'Job must exist': 'Please select a valid job first.',
    'Job must be completed': 'The job must be completed before sending a follow-up.',
    'Follow-up email should be queued': 'Failed to queue follow-up email. Please try again.',
  },
};

function getRecoverySuggestion(toolName: string, failedAssertion: FailedAssertion): string {
  const toolSuggestions = RECOVERY_SUGGESTIONS[toolName];
  if (toolSuggestions) {
    const suggestion = toolSuggestions[failedAssertion.description];
    if (suggestion) return suggestion;
  }
  return 'Please check the data and try again.';
}

// =============================================================================
// ENTITY CONTEXT LOADER
// =============================================================================

async function loadEntityContext(
  supabase: any,
  businessId: string,
  args: Record<string, any>,
  previousResults: Record<string, any>
): Promise<Record<string, any>> {
  const context: Record<string, any> = {};

  // Extract entity IDs from args and previous results
  const quoteId = args.quoteId || previousResults.approve_quote?.quote_id || previousResults.create_quote?.quote_id;
  const jobId = args.jobId || previousResults.convert_quote_to_job?.job_id || previousResults.create_job?.job_id;
  const customerId = args.customerId || previousResults.create_customer?.customer_id;
  const invoiceId = args.invoiceId || previousResults.create_invoice?.invoice_id;
  const requestId = args.requestId || previousResults.create_request?.request_id;
  const userId = args.userId;

  // Load entities in parallel
  const promises: Promise<void>[] = [];

  if (quoteId) {
    promises.push(
      supabase
        .from('quotes')
        .select('*, customer:customers(*)')
        .eq('id', quoteId)
        .eq('business_id', businessId)
        .single()
        .then(({ data }: any) => {
          if (data) {
            context.quote = data;
            context.customer = data.customer;
          }
        })
    );
  }

  if (jobId) {
    promises.push(
      supabase
        .from('jobs')
        .select('*, assignments:job_assignments(*), customer:customers(*)')
        .eq('id', jobId)
        .eq('business_id', businessId)
        .single()
        .then(({ data }: any) => {
          if (data) {
            context.job = data;
            if (!context.customer) context.customer = data.customer;
          }
        })
    );
  }

  if (customerId && !context.customer) {
    promises.push(
      supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('business_id', businessId)
        .single()
        .then(({ data }: any) => {
          if (data) context.customer = data;
        })
    );
  }

  if (requestId) {
    promises.push(
      supabase
        .from('requests')
        .select('*, customer:customers(*)')
        .eq('id', requestId)
        .eq('business_id', businessId)
        .single()
        .then(({ data }: any) => {
          if (data) {
            context.request = data;
            if (!context.customer) context.customer = data.customer;
          }
        })
    );
  }

  if (invoiceId) {
    promises.push(
      supabase
        .from('invoices')
        .select('*, customer:customers(*)')
        .eq('id', invoiceId)
        .eq('business_id', businessId)
        .single()
        .then(({ data }: any) => {
          if (data) {
            context.invoice = data;
            if (!context.customer) context.customer = data.customer;
          }
        })
    );
  }

  if (userId) {
    promises.push(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data }: any) => {
          if (data) context.user = data;
        })
    );
  }

  // Load conversation entity for communication tools
  const conversationId = args.conversationId || previousResults.get_or_create_conversation?.conversation_id || previousResults.create_conversation?.conversation_id;
  if (conversationId) {
    promises.push(
      supabase
        .from('sg_conversations')
        .select('*, customer:customers(*)')
        .eq('id', conversationId)
        .eq('business_id', businessId)
        .single()
        .then(({ data }: any) => {
          if (data) {
            context.conversation = data;
            if (!context.customer) context.customer = data.customer;
          }
        })
    );
  }

  await Promise.all(promises);
  return context;
}

// =============================================================================
// ASSERTION VERIFICATION
// =============================================================================

function resolveReference(ref: string, context: StepExecutionContext, result?: any): any {
  if (ref.startsWith('args.')) {
    const path = ref.slice(5);
    return getNestedValue(context.args, path);
  }
  if (ref.startsWith('result.')) {
    const path = ref.slice(7);
    return getNestedValue(result || {}, path);
  }
  if (ref.startsWith('entities.')) {
    const path = ref.slice(9);
    return getNestedValue(context.entities, path);
  }
  return ref;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

async function verifyAssertions(
  assertions: Assertion[],
  context: StepExecutionContext,
  result?: any
): Promise<{ passed: boolean; failedAssertions: FailedAssertion[] }> {
  const failedAssertions: FailedAssertion[] = [];

  for (const assertion of assertions) {
    let passed = false;
    let actual: any = undefined;
    let expected: any = undefined;

    switch (assertion.type) {
      case 'entity_exists': {
        const entityId = resolveReference(assertion.entityId || '', context, result);
        const entityData = context.entities[assertion.entity || ''];
        passed = !!entityId && !!entityData;
        actual = entityData ? 'exists' : 'not found';
        expected = 'exists';
        break;
      }

      case 'field_equals': {
        const entity = context.entities[assertion.entity || ''];
        actual = entity?.[assertion.field || ''];
        expected = assertion.value;
        passed = actual === expected;
        break;
      }

      case 'field_not_equals': {
        const entity = context.entities[assertion.entity || ''];
        actual = entity?.[assertion.field || ''];
        expected = `not ${assertion.value}`;
        passed = actual !== assertion.value;
        break;
      }

      case 'count_equals': {
        const entity = context.entities[assertion.entity || ''];
        actual = Array.isArray(entity) ? entity.length : 0;
        expected = assertion.count;
        passed = actual === expected;
        break;
      }

      case 'count_greater_than': {
        const entity = context.entities[assertion.entity || ''];
        actual = Array.isArray(entity) ? entity.length : 0;
        expected = `> ${assertion.count}`;
        passed = actual > (assertion.count || 0);
        break;
      }
    }

    if (!passed) {
      failedAssertions.push({
        assertionId: `${assertion.type}_${assertion.entity || ''}_${assertion.field || ''}`,
        description: assertion.description,
        expected,
        actual,
      });
    }
  }

  return { passed: failedAssertions.length === 0, failedAssertions };
}

// =============================================================================
// DATABASE ASSERTION VERIFICATION
// =============================================================================

async function verifyDatabaseAssertions(
  assertions: DatabaseAssertion[],
  context: StepExecutionContext,
  supabase: any,
  result?: any
): Promise<{ passed: boolean; failedAssertions: FailedAssertion[] }> {
  const failedAssertions: FailedAssertion[] = [];

  for (const assertion of assertions) {
    try {
      // Resolve parameter references
      const resolvedParams: Record<string, any> = {};
      if (assertion.params) {
        for (const [key, ref] of Object.entries(assertion.params)) {
          resolvedParams[key] = resolveReference(ref as string, context, result);
        }
      }

      // Parse the SQL-style query to extract table and conditions
      const queryMatch = assertion.query.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
      if (!queryMatch) {
        console.warn(`[step-verifier] Could not parse query: ${assertion.query}`);
        continue;
      }

      const [, selectFields, tableName] = queryMatch;
      
      // Build Supabase query
      let query = supabase.from(tableName).select(selectFields.replace(/COUNT\(\*\)\s+as\s+count/i, 'id'));

      // Apply WHERE conditions from resolved params
      for (const [paramKey, value] of Object.entries(resolvedParams)) {
        // Extract column name from WHERE clause (e.g., "id = $1" -> "id")
        const whereMatch = assertion.query.match(new RegExp(`(\\w+)\\s*=\\s*\\${paramKey.slice(1)}`, 'i'));
        if (whereMatch && value !== undefined && value !== null) {
          query = query.eq(whereMatch[1], value);
        }
      }

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        console.error(`[step-verifier] DB query error:`, error);
        failedAssertions.push({
          assertionId: assertion.description,
          description: assertion.description,
          expected: assertion.expect,
          actual: `query_error: ${error.message}`,
        });
        continue;
      }

      // Verify expectations
      const rowCount = Array.isArray(data) ? data.length : 0;
      
      // Check row count expectation
      if (assertion.expect.rowCount !== undefined) {
        const expectedCount = assertion.expect.rowCount;
        const operator = assertion.expect.operator || 'eq';
        
        let passes = false;
        switch (operator) {
          case 'eq': passes = rowCount === expectedCount; break;
          case 'gt': passes = rowCount > expectedCount; break;
          case 'gte': passes = rowCount >= expectedCount; break;
          case 'lt': passes = rowCount < expectedCount; break;
          case 'lte': passes = rowCount <= expectedCount; break;
          default: passes = rowCount >= expectedCount;
        }
        
        if (!passes) {
          failedAssertions.push({
            assertionId: assertion.description,
            description: assertion.description,
            expected: `rowCount ${operator} ${expectedCount}`,
            actual: rowCount,
          });
        }
      }
      
      // Check field value expectation
      if (assertion.expect.field && data && data.length > 0) {
        const actualValue = data[0][assertion.expect.field];
        const expectedValue = assertion.expect.value;
        
        let passes = false;
        if (expectedValue === 'NOT_NULL') {
          passes = actualValue !== null && actualValue !== undefined;
        } else if (assertion.expect.operator === 'not_null') {
          passes = actualValue !== null && actualValue !== undefined;
        } else {
          passes = actualValue === expectedValue;
        }
        
        if (!passes) {
          failedAssertions.push({
            assertionId: assertion.description,
            description: assertion.description,
            expected: expectedValue === 'NOT_NULL' ? 'not null' : expectedValue,
            actual: actualValue,
          });
        }
      }

      console.log(`[step-verifier] DB assertion passed: ${assertion.description}`);
    } catch (error: any) {
      console.error(`[step-verifier] DB assertion failed:`, error);
      failedAssertions.push({
        assertionId: assertion.description,
        description: assertion.description,
        expected: assertion.expect,
        actual: `error: ${error.message}`,
      });
    }
  }

  return { passed: failedAssertions.length === 0, failedAssertions };
}

// =============================================================================
// MAIN VERIFICATION FUNCTION
// =============================================================================

export async function executeWithVerification(
  toolName: string,
  toolExecutor: () => Promise<any>,
  context: StepExecutionContext,
  supabase: any
): Promise<VerifiedStepResult> {
  const startTime = Date.now();
  const contract = TOOL_CONTRACTS[toolName];

  // If no contract defined, execute without verification
  if (!contract) {
    console.log(`[step-verifier] No contract for ${toolName}, executing without verification`);
    try {
      const result = await toolExecutor();
      return {
        status: 'completed',
        result,
        verification: {
          passed: true,
          phase: 'precondition',
          failedAssertions: [],
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        status: 'failed',
        error: error.message,
        verification: {
          passed: false,
          phase: 'precondition',
          failedAssertions: [],
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  console.log(`[step-verifier] Verifying ${toolName} (process: ${contract.processId}, step: ${contract.subStep})`);

  // Load entity context
  const loadedEntities = await loadEntityContext(
    supabase,
    context.businessId,
    context.args,
    context.previousResults
  );
  const enrichedContext = { ...context, entities: { ...context.entities, ...loadedEntities } };

  // 1. Verify preconditions
  const preCheck = await verifyAssertions(contract.preconditions, enrichedContext);
  if (!preCheck.passed) {
    console.warn(`[step-verifier] Precondition failed for ${toolName}:`, preCheck.failedAssertions);
    return {
      status: 'failed',
      error: `Precondition failed: ${preCheck.failedAssertions[0]?.description}`,
      verification: {
        passed: false,
        phase: 'precondition',
        failedAssertions: preCheck.failedAssertions,
        executionTimeMs: Date.now() - startTime,
      },
      recoverySuggestion: getRecoverySuggestion(toolName, preCheck.failedAssertions[0]),
    };
  }

  // 2. Verify invariants before execution
  const invariantPreCheck = await verifyAssertions(contract.invariants, enrichedContext);
  if (!invariantPreCheck.passed) {
    console.warn(`[step-verifier] Invariant failed (pre) for ${toolName}:`, invariantPreCheck.failedAssertions);
    return {
      status: 'failed',
      error: `Invariant violated: ${invariantPreCheck.failedAssertions[0]?.description}`,
      verification: {
        passed: false,
        phase: 'invariant',
        failedAssertions: invariantPreCheck.failedAssertions,
        executionTimeMs: Date.now() - startTime,
      },
      recoverySuggestion: getRecoverySuggestion(toolName, invariantPreCheck.failedAssertions[0]),
    };
  }

  // 3. Execute the tool
  let result: any;
  try {
    result = await toolExecutor();
  } catch (error: any) {
    console.error(`[step-verifier] Tool execution failed for ${toolName}:`, error);
    return {
      status: 'failed',
      error: error.message,
      verification: {
        passed: false,
        phase: 'postcondition',
        failedAssertions: [{
          assertionId: 'execution_error',
          description: 'Tool execution failed',
          expected: 'success',
          actual: error.message,
        }],
        executionTimeMs: Date.now() - startTime,
      },
    };
  }

  // 4. Reload entity context after execution
  const postEntities = await loadEntityContext(
    supabase,
    context.businessId,
    context.args,
    { ...context.previousResults, [toolName]: result }
  );
  const postContext = { ...enrichedContext, entities: { ...enrichedContext.entities, ...postEntities } };

  // 5. Verify postconditions
  const postCheck = await verifyAssertions(contract.postconditions, postContext, result);
  if (!postCheck.passed) {
    console.warn(`[step-verifier] Postcondition failed for ${toolName}:`, postCheck.failedAssertions);
    
    // Attempt rollback if available
    if (contract.rollbackTool) {
      console.info(`[step-verifier] Attempting rollback with ${contract.rollbackTool}`);
      // Rollback will be handled by the caller
    }

    return {
      status: 'failed',
      result,
      error: `Postcondition failed: ${postCheck.failedAssertions[0]?.description}`,
      verification: {
        passed: false,
        phase: 'postcondition',
        failedAssertions: postCheck.failedAssertions,
        executionTimeMs: Date.now() - startTime,
      },
      recoverySuggestion: getRecoverySuggestion(toolName, postCheck.failedAssertions[0]),
    };
  }

  // 6. Verify invariants after execution
  const invariantPostCheck = await verifyAssertions(contract.invariants, postContext, result);
  if (!invariantPostCheck.passed) {
    console.warn(`[step-verifier] Invariant failed (post) for ${toolName}:`, invariantPostCheck.failedAssertions);
    return {
      status: 'failed',
      result,
      error: `Invariant violated after execution: ${invariantPostCheck.failedAssertions[0]?.description}`,
      verification: {
        passed: false,
        phase: 'invariant',
        failedAssertions: invariantPostCheck.failedAssertions,
        executionTimeMs: Date.now() - startTime,
      },
      recoverySuggestion: getRecoverySuggestion(toolName, invariantPostCheck.failedAssertions[0]),
    };
  }

  // 7. Verify database assertions
  const dbCheck = await verifyDatabaseAssertions(contract.dbAssertions, postContext, supabase, result);
  if (!dbCheck.passed) {
    console.warn(`[step-verifier] DB assertion failed for ${toolName}:`, dbCheck.failedAssertions);
    return {
      status: 'failed',
      result,
      error: `Database assertion failed: ${dbCheck.failedAssertions[0]?.description}`,
      verification: {
        passed: false,
        phase: 'db_assertion',
        failedAssertions: dbCheck.failedAssertions,
        executionTimeMs: Date.now() - startTime,
      },
      recoverySuggestion: 'Please check the database state and try again.',
    };
  }

  // All verifications passed
  console.log(`[step-verifier] All verifications passed for ${toolName}`);
  return {
    status: 'completed',
    result,
    verification: {
      passed: true,
      phase: 'db_assertion',
      failedAssertions: [],
      executionTimeMs: Date.now() - startTime,
    },
  };
}

// =============================================================================
// VERIFICATION METRICS LOGGING
// =============================================================================

export async function logVerificationResult(
  supabase: any,
  params: {
    planId: string;
    stepId: string;
    toolName: string;
    businessId: string;
    userId: string;
    verificationResult: VerifiedStepResult;
  }
): Promise<void> {
  try {
    await supabase.from('ai_activity_log').insert({
      business_id: params.businessId,
      user_id: params.userId,
      activity_type: 'step_verification',
      description: params.verificationResult.verification.passed
        ? `Verified: ${params.toolName}`
        : `Verification failed: ${params.toolName} (${params.verificationResult.verification.phase})`,
      metadata: {
        plan_id: params.planId,
        step_id: params.stepId,
        tool_name: params.toolName,
        verification_passed: params.verificationResult.verification.passed,
        phase: params.verificationResult.verification.phase,
        failed_assertions: params.verificationResult.verification.failedAssertions,
        execution_time_ms: params.verificationResult.verification.executionTimeMs,
        recovery_suggestion: params.verificationResult.recoverySuggestion,
      },
    });
  } catch (error) {
    console.error('[step-verifier] Failed to log verification result:', error);
  }
}

// =============================================================================
// GET CONTRACT (for external use)
// =============================================================================

export function getToolContract(toolName: string): ToolContract | undefined {
  return TOOL_CONTRACTS[toolName];
}

export function hasContract(toolName: string): boolean {
  return toolName in TOOL_CONTRACTS;
}

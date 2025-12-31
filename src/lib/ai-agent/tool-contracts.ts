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
// INVOICING TOOL CONTRACTS
// ============================================================================

export const CREATE_INVOICE_CONTRACT: ToolContract = {
  toolName: 'create_invoice',
  description: 'Create a new invoice for a customer',
  processId: 'invoicing',
  subStepId: 'create_invoice',
  
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
      id: 'invoice_created',
      description: 'Invoice was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    },
    {
      id: 'invoice_status_draft',
      description: 'New invoice status is Draft',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Draft'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'invoice_in_db',
      description: 'Invoice exists in database',
      table: 'invoices',
      query: {
        select: 'id, status, customer_id',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'void_invoice',
  rollbackArgs: { invoice_id: 'result.id' }
};

export const SEND_INVOICE_CONTRACT: ToolContract = {
  toolName: 'send_invoice',
  description: 'Send an invoice to the customer via email',
  processId: 'invoicing',
  subStepId: 'send_invoice',
  
  preconditions: [
    {
      id: 'invoice_exists',
      description: 'Invoice must exist',
      type: 'entity_exists',
      entity: 'invoice',
      field: 'id',
      fromArg: 'invoice_id'
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
      id: 'invoice_sent',
      description: 'Invoice status changed to Sent',
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
        select: 'id, invoice_id, status',
        where: { invoice_id: 'args.invoice_id' }
      },
      expect: {
        count: 1
      }
    }
  ]
};

export const VOID_INVOICE_CONTRACT: ToolContract = {
  toolName: 'void_invoice',
  description: 'Void an invoice that should not be collected',
  processId: 'invoicing',
  subStepId: 'review_invoice',
  
  preconditions: [
    {
      id: 'invoice_exists',
      description: 'Invoice must exist',
      type: 'entity_exists',
      entity: 'invoice',
      field: 'id',
      fromArg: 'invoice_id'
    },
    {
      id: 'invoice_not_paid',
      description: 'Invoice must not be already paid',
      type: 'field_not_null',
      entity: 'invoice',
      field: 'status',
      operator: '!=',
      value: 'Paid'
    }
  ],
  
  postconditions: [
    {
      id: 'invoice_voided',
      description: 'Invoice status changed to Void',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Void'
    }
  ],
  
  invariants: [],
  dbAssertions: []
};

// ============================================================================
// PAYMENT COLLECTION TOOL CONTRACTS
// ============================================================================

export const RECORD_PAYMENT_CONTRACT: ToolContract = {
  toolName: 'record_payment',
  description: 'Record a payment received for an invoice',
  processId: 'payment_collection',
  subStepId: 'process_payment',
  
  preconditions: [
    {
      id: 'invoice_exists',
      description: 'Invoice must exist',
      type: 'entity_exists',
      entity: 'invoice',
      field: 'id',
      fromArg: 'invoice_id'
    },
    {
      id: 'invoice_not_paid',
      description: 'Invoice must not be already fully paid',
      type: 'field_not_null',
      entity: 'invoice',
      field: 'status',
      operator: '!=',
      value: 'Paid'
    }
  ],
  
  postconditions: [
    {
      id: 'payment_recorded',
      description: 'Payment was recorded',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'payment_in_db',
      description: 'Payment exists in database',
      table: 'payments',
      query: {
        select: 'id, invoice_id, amount',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'process_refund',
  rollbackArgs: { payment_id: 'result.id' }
};

export const PROCESS_REFUND_CONTRACT: ToolContract = {
  toolName: 'process_refund',
  description: 'Process a refund for a payment',
  processId: 'payment_collection',
  subStepId: 'process_payment',
  
  preconditions: [
    {
      id: 'payment_exists',
      description: 'Payment must exist',
      type: 'entity_exists',
      entity: 'payment',
      field: 'id',
      fromArg: 'payment_id'
    }
  ],
  
  postconditions: [
    {
      id: 'refund_processed',
      description: 'Refund was processed',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Refunded'
    }
  ],
  
  invariants: [],
  dbAssertions: []
};

// ============================================================================
// QUALITY ASSURANCE TOOL CONTRACTS
// ============================================================================

export const COMPLETE_JOB_CONTRACT: ToolContract = {
  toolName: 'complete_job',
  description: 'Mark a job as completed after quality verification',
  processId: 'quality_assurance',
  subStepId: 'customer_signoff',
  
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
      id: 'job_in_progress',
      description: 'Job must be in progress',
      type: 'field_equals',
      entity: 'job',
      field: 'status',
      value: 'In Progress'
    }
  ],
  
  postconditions: [
    {
      id: 'job_completed',
      description: 'Job status changed to Completed',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Completed'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'job_completed_in_db',
      description: 'Job is completed in database',
      table: 'jobs',
      query: {
        select: 'id, status',
        where: { id: 'args.job_id' }
      },
      expect: {
        field: 'status',
        operator: '==',
        value: 'Completed'
      }
    }
  ]
};

// ============================================================================
// INVENTORY MANAGEMENT TOOL CONTRACTS
// ============================================================================

export const UPDATE_INVENTORY_CONTRACT: ToolContract = {
  toolName: 'update_inventory',
  description: 'Update inventory item quantity or details',
  processId: 'inventory_management',
  subStepId: 'receive_stock',
  
  preconditions: [
    {
      id: 'item_exists',
      description: 'Inventory item must exist',
      type: 'entity_exists',
      entity: 'inventory_item',
      field: 'id',
      fromArg: 'item_id'
    }
  ],
  
  postconditions: [
    {
      id: 'item_updated',
      description: 'Inventory item was updated',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'inventory_updated_in_db',
      description: 'Inventory updated in database',
      table: 'inventory_items',
      query: {
        select: 'id, current_quantity, updated_at',
        where: { id: 'args.item_id' }
      },
      expect: {
        field: 'updated_at',
        operator: 'not_null'
      }
    }
  ]
};

export const CREATE_INVENTORY_ITEM_CONTRACT: ToolContract = {
  toolName: 'create_inventory_item',
  description: 'Create a new inventory item',
  processId: 'inventory_management',
  subStepId: 'receive_stock',
  
  preconditions: [],
  
  postconditions: [
    {
      id: 'item_created',
      description: 'Inventory item was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'inventory_in_db',
      description: 'Inventory item exists in database',
      table: 'inventory_items',
      query: {
        select: 'id, name, current_quantity',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_inventory_item',
  rollbackArgs: { item_id: 'result.id' }
};

export const DELETE_INVENTORY_ITEM_CONTRACT: ToolContract = {
  toolName: 'delete_inventory_item',
  description: 'Delete an inventory item',
  processId: 'inventory_management',
  subStepId: 'track_usage',
  
  preconditions: [
    {
      id: 'item_exists',
      description: 'Inventory item must exist',
      type: 'entity_exists',
      entity: 'inventory_item',
      field: 'id',
      fromArg: 'item_id'
    }
  ],
  
  postconditions: [
    {
      id: 'item_deleted',
      description: 'Inventory item was deleted',
      type: 'field_equals',
      entity: 'result',
      field: 'deleted',
      value: true
    }
  ],
  
  invariants: [],
  dbAssertions: []
};

// ============================================================================
// LEAD GENERATION TOOL CONTRACTS
// ============================================================================

export const CREATE_CUSTOMER_CONTRACT: ToolContract = {
  toolName: 'create_customer',
  description: 'Create a new customer record',
  processId: 'lead_generation',
  subStepId: 'capture_lead',
  
  preconditions: [
    {
      id: 'email_provided',
      description: 'Customer email must be provided',
      type: 'field_not_null',
      entity: 'args',
      field: 'email'
    },
    {
      id: 'name_provided',
      description: 'Customer name must be provided',
      type: 'field_not_null',
      entity: 'args',
      field: 'name'
    }
  ],
  
  postconditions: [
    {
      id: 'customer_created',
      description: 'Customer was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'customer_in_db',
      description: 'Customer exists in database',
      table: 'customers',
      query: {
        select: 'id, name, email',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_customer',
  rollbackArgs: { customer_id: 'result.id' }
};

export const UPDATE_CUSTOMER_CONTRACT: ToolContract = {
  toolName: 'update_customer',
  description: 'Update an existing customer record',
  processId: 'lead_generation',
  subStepId: 'qualify_lead',
  
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
      id: 'customer_updated',
      description: 'Customer was updated',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [
    {
      id: 'business_unchanged',
      description: 'Business ID should not change',
      type: 'field_equals',
      entity: 'customer',
      field: 'business_id',
      fromArg: 'original_business_id'
    }
  ],
  
  dbAssertions: [
    {
      id: 'customer_updated_in_db',
      description: 'Customer updated in database',
      table: 'customers',
      query: {
        select: 'id, updated_at',
        where: { id: 'args.customer_id' }
      },
      expect: {
        field: 'updated_at',
        operator: 'not_null'
      }
    }
  ]
};

export const CREATE_REQUEST_CONTRACT: ToolContract = {
  toolName: 'create_request',
  description: 'Create a new service request from a customer',
  processId: 'lead_generation',
  subStepId: 'capture_lead',
  
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
      id: 'request_created',
      description: 'Request was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'request_in_db',
      description: 'Request exists in database',
      table: 'requests',
      query: {
        select: 'id, customer_id, status',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ]
};

// ============================================================================
// SITE ASSESSMENT TOOL CONTRACTS
// ============================================================================

export const CREATE_ASSESSMENT_JOB_CONTRACT: ToolContract = {
  toolName: 'create_assessment_job',
  description: 'Create a site assessment job',
  processId: 'site_assessment',
  subStepId: 'schedule_assessment',
  
  preconditions: [
    {
      id: 'customer_exists',
      description: 'Customer must exist',
      type: 'entity_exists',
      entity: 'customer',
      field: 'id',
      fromArg: 'customer_id'
    },
    {
      id: 'address_provided',
      description: 'Address must be provided for site assessment',
      type: 'field_not_null',
      entity: 'args',
      field: 'address'
    }
  ],
  
  postconditions: [
    {
      id: 'assessment_created',
      description: 'Assessment job was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    },
    {
      id: 'is_assessment_flag',
      description: 'Job is marked as assessment',
      type: 'field_equals',
      entity: 'result',
      field: 'is_assessment',
      value: true
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'assessment_in_db',
      description: 'Assessment job exists in database',
      table: 'jobs',
      query: {
        select: 'id, is_assessment, customer_id',
        where: { id: 'result.id' }
      },
      expect: {
        field: 'is_assessment',
        operator: '==',
        value: true
      }
    }
  ],
  
  rollbackTool: 'delete_job',
  rollbackArgs: { job_id: 'result.id' }
};

// ============================================================================
// PREVENTIVE MAINTENANCE TOOL CONTRACTS
// ============================================================================

export const CREATE_RECURRING_JOB_CONTRACT: ToolContract = {
  toolName: 'create_recurring_job',
  description: 'Create a recurring job for preventive maintenance',
  processId: 'preventive_maintenance',
  subStepId: 'generate_jobs',
  
  preconditions: [
    {
      id: 'customer_exists',
      description: 'Customer must exist',
      type: 'entity_exists',
      entity: 'customer',
      field: 'id',
      fromArg: 'customer_id'
    },
    {
      id: 'frequency_provided',
      description: 'Recurrence frequency must be specified',
      type: 'field_not_null',
      entity: 'args',
      field: 'recurrence'
    }
  ],
  
  postconditions: [
    {
      id: 'job_created',
      description: 'Recurring job was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    },
    {
      id: 'is_recurring_flag',
      description: 'Job is marked as recurring',
      type: 'field_equals',
      entity: 'result',
      field: 'is_recurring',
      value: true
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'recurring_job_in_db',
      description: 'Recurring job exists in database',
      table: 'jobs',
      query: {
        select: 'id, is_recurring, recurrence',
        where: { id: 'result.id' }
      },
      expect: {
        field: 'is_recurring',
        operator: '==',
        value: true
      }
    }
  ]
};

// ============================================================================
// REVIEWS & REPUTATION TOOL CONTRACTS
// ============================================================================

export const REQUEST_REVIEW_CONTRACT: ToolContract = {
  toolName: 'request_review',
  description: 'Send a review request to a customer after service',
  processId: 'reviews_reputation',
  subStepId: 'request_review',
  
  preconditions: [
    {
      id: 'customer_exists',
      description: 'Customer must exist',
      type: 'entity_exists',
      entity: 'customer',
      field: 'id',
      fromArg: 'customer_id'
    },
    {
      id: 'job_completed',
      description: 'Job must be completed',
      type: 'field_equals',
      entity: 'job',
      field: 'status',
      value: 'Completed'
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
      id: 'review_requested',
      description: 'Review request was sent',
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
      description: 'Review request email was logged',
      table: 'mail_sends',
      query: {
        select: 'id, job_id, subject',
        where: { job_id: 'args.job_id' }
      },
      expect: {
        count: 1
      }
    }
  ]
};

// ============================================================================
// WARRANTY MANAGEMENT TOOL CONTRACTS
// ============================================================================

export const CREATE_WARRANTY_REQUEST_CONTRACT: ToolContract = {
  toolName: 'create_warranty_request',
  description: 'Create a warranty claim request',
  processId: 'warranty_management',
  subStepId: 'receive_claim',
  
  preconditions: [
    {
      id: 'customer_exists',
      description: 'Customer must exist',
      type: 'entity_exists',
      entity: 'customer',
      field: 'id',
      fromArg: 'customer_id'
    },
    {
      id: 'original_job_exists',
      description: 'Original job must exist for warranty claim',
      type: 'entity_exists',
      entity: 'job',
      field: 'id',
      fromArg: 'original_job_id'
    }
  ],
  
  postconditions: [
    {
      id: 'request_created',
      description: 'Warranty request was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'request_in_db',
      description: 'Warranty request exists in database',
      table: 'requests',
      query: {
        select: 'id, customer_id',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ]
};

export const CREATE_WARRANTY_JOB_CONTRACT: ToolContract = {
  toolName: 'create_warranty_job',
  description: 'Create a job to fulfill a warranty claim',
  processId: 'warranty_management',
  subStepId: 'schedule_repair',
  
  preconditions: [
    {
      id: 'customer_exists',
      description: 'Customer must exist',
      type: 'entity_exists',
      entity: 'customer',
      field: 'id',
      fromArg: 'customer_id'
    },
    {
      id: 'warranty_valid',
      description: 'Warranty claim must be approved',
      type: 'field_equals',
      entity: 'args',
      field: 'warranty_approved',
      value: true
    }
  ],
  
  postconditions: [
    {
      id: 'warranty_job_created',
      description: 'Warranty job was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'warranty_job_in_db',
      description: 'Warranty job exists in database',
      table: 'jobs',
      query: {
        select: 'id, customer_id, status',
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

// ============================================================================
// CONVERT QUOTE TO JOB TOOL CONTRACT
// ============================================================================

export const CONVERT_QUOTE_TO_JOB_CONTRACT: ToolContract = {
  toolName: 'convert_quote_to_job',
  description: 'Convert an approved quote to a job',
  processId: 'scheduling',
  subStepId: 'schedule_appointment',
  
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
      id: 'quote_approved',
      description: 'Quote must be approved',
      type: 'field_equals',
      entity: 'quote',
      field: 'status',
      value: 'Approved'
    }
  ],
  
  postconditions: [
    {
      id: 'job_created',
      description: 'Job was created from quote',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    },
    {
      id: 'job_linked_to_quote',
      description: 'Job is linked to the quote',
      type: 'field_not_null',
      entity: 'result',
      field: 'quote_id'
    }
  ],
  
  invariants: [
    {
      id: 'customer_preserved',
      description: 'Customer should be same as quote customer',
      type: 'field_equals',
      entity: 'result',
      field: 'customer_id',
      fromArg: 'quote.customer_id'
    }
  ],
  
  dbAssertions: [
    {
      id: 'job_in_db',
      description: 'Job exists in database with quote reference',
      table: 'jobs',
      query: {
        select: 'id, quote_id, customer_id',
        where: { id: 'result.id' }
      },
      expect: {
        field: 'quote_id',
        operator: 'not_null'
      }
    }
  ],
  
  rollbackTool: 'delete_job',
  rollbackArgs: { job_id: 'result.id' }
};

// ============================================================================
// UPDATE JOB CONTRACT
// ============================================================================

export const UPDATE_JOB_CONTRACT: ToolContract = {
  toolName: 'update_job',
  description: 'Update an existing job',
  processId: 'dispatching',
  subStepId: 'dispatch',
  
  preconditions: [
    {
      id: 'job_exists',
      description: 'Job must exist',
      type: 'entity_exists',
      entity: 'job',
      field: 'id',
      fromArg: 'job_id'
    }
  ],
  
  postconditions: [
    {
      id: 'job_updated',
      description: 'Job was updated',
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
      entity: 'job',
      field: 'customer_id',
      fromArg: 'original_customer_id'
    }
  ],
  
  dbAssertions: [
    {
      id: 'job_updated_in_db',
      description: 'Job updated in database',
      table: 'jobs',
      query: {
        select: 'id, updated_at',
        where: { id: 'args.job_id' }
      },
      expect: {
        field: 'updated_at',
        operator: 'not_null'
      }
    }
  ]
};

// ============================================================================
// UNASSIGN JOB CONTRACT
// ============================================================================

export const UNASSIGN_JOB_CONTRACT: ToolContract = {
  toolName: 'unassign_job',
  description: 'Remove a team member assignment from a job',
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
      id: 'assignment_exists',
      description: 'Assignment must exist',
      type: 'custom',
      customCheck: 'job.assignments.some(a => a.user_id === args.user_id)'
    }
  ],
  
  postconditions: [
    {
      id: 'assignment_removed',
      description: 'Assignment was removed',
      type: 'field_equals',
      entity: 'result',
      field: 'removed',
      value: true
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'assignment_removed_from_db',
      description: 'Assignment removed from database',
      table: 'job_assignments',
      query: {
        select: 'id',
        where: { job_id: 'args.job_id', user_id: 'args.user_id' }
      },
      expect: {
        count: 0
      }
    }
  ]
};

// ============================================================================
// INVOICE LINE ITEM CONTRACTS
// ============================================================================

export const CREATE_INVOICE_LINE_ITEM_CONTRACT: ToolContract = {
  toolName: 'create_invoice_line_item',
  description: 'Add a line item to an invoice',
  processId: 'invoicing',
  subStepId: 'create_invoice',
  
  preconditions: [
    {
      id: 'invoice_exists',
      description: 'Invoice must exist',
      type: 'entity_exists',
      entity: 'invoice',
      field: 'id',
      fromArg: 'invoice_id'
    },
    {
      id: 'invoice_editable',
      description: 'Invoice must be in editable status',
      type: 'field_equals',
      entity: 'invoice',
      field: 'status',
      operator: 'in',
      value: ['Draft', 'Sent']
    }
  ],
  
  postconditions: [
    {
      id: 'line_item_created',
      description: 'Line item was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'line_item_in_db',
      description: 'Line item exists in database',
      table: 'invoice_line_items',
      query: {
        select: 'id, invoice_id, name',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_invoice_line_item',
  rollbackArgs: { line_item_id: 'result.id' }
};

// ============================================================================
// QUOTE LINE ITEM CONTRACTS
// ============================================================================

export const CREATE_QUOTE_LINE_ITEM_CONTRACT: ToolContract = {
  toolName: 'create_quote_line_item',
  description: 'Add a line item to a quote',
  processId: 'quoting_estimating',
  subStepId: 'design_solution',
  
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
      id: 'quote_editable',
      description: 'Quote must be in editable status',
      type: 'field_equals',
      entity: 'quote',
      field: 'status',
      operator: 'in',
      value: ['Draft', 'Sent']
    }
  ],
  
  postconditions: [
    {
      id: 'line_item_created',
      description: 'Line item was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'line_item_in_db',
      description: 'Line item exists in database',
      table: 'quote_line_items',
      query: {
        select: 'id, quote_id, name',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_quote_line_item',
  rollbackArgs: { line_item_id: 'result.id' }
};

export const UPDATE_QUOTE_LINE_ITEM_CONTRACT: ToolContract = {
  toolName: 'update_quote_line_item',
  description: 'Update a quote line item',
  processId: 'quoting_estimating',
  subStepId: 'calculate_costs',
  
  preconditions: [
    {
      id: 'line_item_exists',
      description: 'Line item must exist',
      type: 'entity_exists',
      entity: 'quote_line_item',
      field: 'id',
      fromArg: 'line_item_id'
    }
  ],
  
  postconditions: [
    {
      id: 'line_item_updated',
      description: 'Line item was updated',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'line_item_updated_in_db',
      description: 'Line item updated in database',
      table: 'quote_line_items',
      query: {
        select: 'id, updated_at',
        where: { id: 'args.line_item_id' }
      },
      expect: {
        field: 'updated_at',
        operator: 'not_null'
      }
    }
  ]
};

export const DELETE_QUOTE_LINE_ITEM_CONTRACT: ToolContract = {
  toolName: 'delete_quote_line_item',
  description: 'Delete a quote line item',
  processId: 'quoting_estimating',
  subStepId: 'calculate_costs',
  
  preconditions: [
    {
      id: 'line_item_exists',
      description: 'Line item must exist',
      type: 'entity_exists',
      entity: 'quote_line_item',
      field: 'id',
      fromArg: 'line_item_id'
    }
  ],
  
  postconditions: [
    {
      id: 'line_item_deleted',
      description: 'Line item was deleted',
      type: 'field_equals',
      entity: 'result',
      field: 'deleted',
      value: true
    }
  ],
  
  invariants: [],
  dbAssertions: []
};

// ============================================================================
// TOOL CONTRACT REGISTRY
// ============================================================================

export const TOOL_CONTRACTS: Record<string, ToolContract> = {
  // Lead Generation
  create_customer: CREATE_CUSTOMER_CONTRACT,
  update_customer: UPDATE_CUSTOMER_CONTRACT,
  create_request: CREATE_REQUEST_CONTRACT,
  // Site Assessment
  create_assessment_job: CREATE_ASSESSMENT_JOB_CONTRACT,
  // Quoting/Estimating
  create_quote: CREATE_QUOTE_CONTRACT,
  update_quote: UPDATE_QUOTE_CONTRACT,
  approve_quote: APPROVE_QUOTE_CONTRACT,
  send_quote: SEND_QUOTE_CONTRACT,
  create_quote_line_item: CREATE_QUOTE_LINE_ITEM_CONTRACT,
  update_quote_line_item: UPDATE_QUOTE_LINE_ITEM_CONTRACT,
  delete_quote_line_item: DELETE_QUOTE_LINE_ITEM_CONTRACT,
  // Scheduling
  create_job: CREATE_JOB_CONTRACT,
  schedule_job: SCHEDULE_JOB_CONTRACT,
  convert_quote_to_job: CONVERT_QUOTE_TO_JOB_CONTRACT,
  // Dispatching
  assign_job: ASSIGN_JOB_CONTRACT,
  unassign_job: UNASSIGN_JOB_CONTRACT,
  update_job: UPDATE_JOB_CONTRACT,
  // Customer Communication
  send_job_confirmation: SEND_JOB_CONFIRMATION_CONTRACT,
  // Quality Assurance
  complete_job: COMPLETE_JOB_CONTRACT,
  // Preventive Maintenance
  create_recurring_job: CREATE_RECURRING_JOB_CONTRACT,
  // Invoicing
  create_invoice: CREATE_INVOICE_CONTRACT,
  send_invoice: SEND_INVOICE_CONTRACT,
  void_invoice: VOID_INVOICE_CONTRACT,
  create_invoice_line_item: CREATE_INVOICE_LINE_ITEM_CONTRACT,
  // Payment Collection
  record_payment: RECORD_PAYMENT_CONTRACT,
  process_refund: PROCESS_REFUND_CONTRACT,
  // Reviews & Reputation
  request_review: REQUEST_REVIEW_CONTRACT,
  // Warranty Management
  create_warranty_request: CREATE_WARRANTY_REQUEST_CONTRACT,
  create_warranty_job: CREATE_WARRANTY_JOB_CONTRACT,
  // Inventory Management
  update_inventory: UPDATE_INVENTORY_CONTRACT,
  create_inventory_item: CREATE_INVENTORY_ITEM_CONTRACT,
  delete_inventory_item: DELETE_INVENTORY_ITEM_CONTRACT
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

/**
 * Get contracts for a phase
 */
export function getPhaseContracts(phase: string): ToolContract[] {
  const phaseProcessMap: Record<string, string[]> = {
    pre_service: ['lead_generation', 'customer_communication', 'site_assessment', 'quoting_estimating', 'scheduling'],
    service_delivery: ['dispatching', 'quality_assurance', 'preventive_maintenance'],
    post_service: ['invoicing', 'payment_collection', 'reviews_reputation', 'warranty_management'],
    operations: ['inventory_management', 'reporting_analytics', 'seasonal_planning']
  };
  
  const processIds = phaseProcessMap[phase] || [];
  return Object.values(TOOL_CONTRACTS).filter(c => processIds.includes(c.processId));
}

/**
 * Check if a tool has a contract defined
 */
export function hasToolContract(toolName: string): boolean {
  return toolName in TOOL_CONTRACTS;
}

/**
 * Get all tool names that have contracts
 */
export function getContractedTools(): string[] {
  return Object.keys(TOOL_CONTRACTS);
}

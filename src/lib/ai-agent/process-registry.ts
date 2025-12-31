/**
 * Process Registry - Maps the 15 Universal Processes to their constituent tools
 * Organized by user journey phase: Pre-Service, Service Delivery, Post-Service, Operations
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ProcessPhase = 'pre_service' | 'service_delivery' | 'post_service' | 'operations';

export interface PhaseDefinition {
  id: ProcessPhase;
  name: string;
  description: string;
  processes: string[];  // Process IDs in execution order
  nextPhases: ProcessPhase[];  // Natural transitions
}

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
  phase: ProcessPhase;
  order: number;  // Order within phase (1-5)
  subSteps: SubStep[];
  tools: string[];  // All tools that implement this process
  inputContract: Record<string, string>;  // Required inputs with types
  outputContract: Record<string, string>; // Expected outputs with types
  entryConditions: Condition[];
  exitConditions: Condition[];
  userCheckpoints?: string[];  // Points where user approval is required
  nextProcesses: string[];  // Natural next processes
  previousProcesses: string[];  // What typically precedes this
}

// ============================================================================
// PHASE REGISTRY
// ============================================================================

export const PHASE_REGISTRY: Record<ProcessPhase, PhaseDefinition> = {
  pre_service: {
    id: 'pre_service',
    name: 'Pre-Service',
    description: 'Customer acquisition through job booking',
    processes: ['lead_generation', 'customer_communication', 'site_assessment', 'quoting_estimating', 'scheduling'],
    nextPhases: ['service_delivery']
  },
  service_delivery: {
    id: 'service_delivery',
    name: 'Service Delivery',
    description: 'Dispatching crews and performing work',
    processes: ['dispatching', 'quality_assurance', 'preventive_maintenance'],
    nextPhases: ['post_service']
  },
  post_service: {
    id: 'post_service',
    name: 'Post-Service',
    description: 'Billing, payment, and follow-up',
    processes: ['invoicing', 'payment_collection', 'reviews_reputation', 'warranty_management'],
    nextPhases: ['pre_service']  // Cycle back for repeat customers
  },
  operations: {
    id: 'operations',
    name: 'Operations',
    description: 'Ongoing business management',
    processes: ['inventory_management', 'reporting_analytics', 'seasonal_planning'],
    nextPhases: []  // Cross-cuts all phases
  }
};

// ============================================================================
// PRE-SERVICE PROCESSES (1-5)
// ============================================================================

export const LEAD_GENERATION: ProcessDefinition = {
  id: 'lead_generation',
  name: 'Lead Generation',
  description: 'Customer discovers your business through various channels',
  phase: 'pre_service',
  order: 1,
  subSteps: [
    {
      id: 'capture_lead',
      name: 'Capture Lead Information',
      description: 'Record potential customer contact details and interest',
      tools: ['create_customer', 'create_request']
    },
    {
      id: 'qualify_lead',
      name: 'Qualify Lead',
      description: 'Assess lead quality and service fit',
      tools: ['get_customer', 'update_customer']
    },
    {
      id: 'initial_response',
      name: 'Send Initial Response',
      description: 'Acknowledge inquiry and provide initial information',
      tools: ['send_email']
    }
  ],
  tools: [
    'create_customer',
    'update_customer',
    'get_customer',
    'create_request',
    'send_email'
  ],
  inputContract: {
    name: 'string',
    email: 'string',
    phone: 'string?',
    service_interest: 'string?'
  },
  outputContract: {
    customer_id: 'uuid',
    request_id: 'uuid?',
    lead_qualified: 'boolean'
  },
  entryConditions: [],
  exitConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  userCheckpoints: [],
  nextProcesses: ['customer_communication', 'site_assessment'],
  previousProcesses: []
};

export const CUSTOMER_COMMUNICATION: ProcessDefinition = {
  id: 'customer_communication',
  name: 'Customer Communication',
  description: 'Manage all customer touchpoints throughout the service lifecycle',
  phase: 'pre_service',
  order: 2,
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
      tools: ['update_job']
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
    'update_customer',
    'send_email'
  ],
  inputContract: {
    customer_id: 'uuid',
    communication_type: 'string',
    entity_id: 'uuid?',
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
  userCheckpoints: [],
  nextProcesses: ['site_assessment', 'quoting_estimating'],
  previousProcesses: ['lead_generation']
};

export const SITE_ASSESSMENT: ProcessDefinition = {
  id: 'site_assessment',
  name: 'Site Assessment',
  description: 'Evaluate job requirements through on-site or remote assessment',
  phase: 'pre_service',
  order: 3,
  subSteps: [
    {
      id: 'schedule_assessment',
      name: 'Schedule Assessment Visit',
      description: 'Book time for site evaluation',
      tools: ['create_job', 'schedule_job']
    },
    {
      id: 'conduct_assessment',
      name: 'Conduct Site Assessment',
      description: 'Evaluate conditions, measurements, and requirements',
      tools: ['update_job', 'get_job']
    },
    {
      id: 'document_findings',
      name: 'Document Findings',
      description: 'Record photos, notes, and measurements',
      tools: ['update_job']
    },
    {
      id: 'identify_requirements',
      name: 'Identify Materials and Labor',
      description: 'Determine what is needed for the job',
      tools: ['get_inventory', 'list_team_members']
    }
  ],
  tools: [
    'create_job',
    'update_job',
    'get_job',
    'schedule_job',
    'get_inventory',
    'list_team_members'
  ],
  inputContract: {
    customer_id: 'uuid',
    address: 'string',
    service_type: 'string?'
  },
  outputContract: {
    assessment_job_id: 'uuid',
    findings: 'string?',
    estimated_scope: 'string?'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  exitConditions: [
    { type: 'entity_exists', entity: 'job', field: 'id' },
    { type: 'status_equals', entity: 'job', field: 'is_assessment', value: true }
  ],
  userCheckpoints: ['assessment_complete'],
  nextProcesses: ['quoting_estimating'],
  previousProcesses: ['lead_generation', 'customer_communication']
};

export const QUOTING_ESTIMATING: ProcessDefinition = {
  id: 'quoting_estimating',
  name: 'Quoting/Estimating',
  description: 'Create and manage quotes for customers, from initial request through approval',
  phase: 'pre_service',
  order: 4,
  subSteps: [
    {
      id: 'receive_request',
      name: 'Receive Service Request',
      description: 'Capture customer request details and requirements',
      tools: ['create_request', 'get_customer']
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
  userCheckpoints: ['quote_approval'],
  nextProcesses: ['scheduling'],
  previousProcesses: ['site_assessment', 'customer_communication']
};

export const SCHEDULING: ProcessDefinition = {
  id: 'scheduling',
  name: 'Scheduling',
  description: 'Schedule jobs based on availability, skills, and customer preferences',
  phase: 'pre_service',
  order: 5,
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
    'send_job_confirmation',
    'convert_quote_to_job'
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
  userCheckpoints: ['schedule_confirmation'],
  nextProcesses: ['dispatching'],
  previousProcesses: ['quoting_estimating']
};

// ============================================================================
// SERVICE DELIVERY PROCESSES (6-8)
// ============================================================================

export const DISPATCHING: ProcessDefinition = {
  id: 'dispatching',
  name: 'Dispatching',
  description: 'Assign and dispatch technicians to scheduled jobs',
  phase: 'service_delivery',
  order: 1,
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
      tools: ['update_job']
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
    'send_job_confirmation',
    'get_inventory'
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
  userCheckpoints: [],
  nextProcesses: ['quality_assurance'],
  previousProcesses: ['scheduling']
};

export const QUALITY_ASSURANCE: ProcessDefinition = {
  id: 'quality_assurance',
  name: 'Quality Assurance',
  description: 'Verify work quality and completion standards',
  phase: 'service_delivery',
  order: 2,
  subSteps: [
    {
      id: 'review_work',
      name: 'Review Completed Work',
      description: 'Inspect job completion and quality',
      tools: ['get_job', 'update_job']
    },
    {
      id: 'document_completion',
      name: 'Document Completion',
      description: 'Record photos and completion notes',
      tools: ['update_job']
    },
    {
      id: 'customer_signoff',
      name: 'Get Customer Sign-off',
      description: 'Obtain customer approval of completed work',
      tools: ['update_job', 'send_job_confirmation']
    },
    {
      id: 'log_issues',
      name: 'Log Any Issues',
      description: 'Record any problems or follow-up needed',
      tools: ['update_job', 'create_request']
    }
  ],
  tools: [
    'get_job',
    'update_job',
    'list_jobs',
    'send_job_confirmation',
    'create_request'
  ],
  inputContract: {
    job_id: 'uuid'
  },
  outputContract: {
    job_id: 'uuid',
    quality_approved: 'boolean',
    issues: 'string[]?'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'job', field: 'id' },
    { type: 'status_equals', entity: 'job', field: 'status', value: 'In Progress' }
  ],
  exitConditions: [
    { type: 'status_equals', entity: 'job', field: 'status', value: 'Completed' }
  ],
  userCheckpoints: ['quality_approval'],
  nextProcesses: ['invoicing'],
  previousProcesses: ['dispatching']
};

export const PREVENTIVE_MAINTENANCE: ProcessDefinition = {
  id: 'preventive_maintenance',
  name: 'Preventive Maintenance',
  description: 'Manage recurring service schedules and maintenance programs',
  phase: 'service_delivery',
  order: 3,
  subSteps: [
    {
      id: 'identify_schedule',
      name: 'Identify Maintenance Schedule',
      description: 'Determine recurring service requirements',
      tools: ['get_customer', 'list_jobs']
    },
    {
      id: 'generate_jobs',
      name: 'Generate Recurring Jobs',
      description: 'Create jobs from recurring templates',
      tools: ['create_job', 'schedule_job']
    },
    {
      id: 'notify_customer',
      name: 'Notify Customer',
      description: 'Send upcoming maintenance reminders',
      tools: ['send_job_confirmation', 'send_email']
    },
    {
      id: 'track_history',
      name: 'Track Service History',
      description: 'Maintain equipment and service records',
      tools: ['get_job', 'list_jobs', 'update_customer']
    }
  ],
  tools: [
    'create_job',
    'update_job',
    'get_job',
    'list_jobs',
    'schedule_job',
    'get_customer',
    'update_customer',
    'send_job_confirmation',
    'send_email'
  ],
  inputContract: {
    customer_id: 'uuid',
    service_type: 'string',
    frequency: 'string'
  },
  outputContract: {
    recurring_job_ids: 'uuid[]',
    next_service_date: 'timestamp'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  exitConditions: [
    { type: 'entity_exists', entity: 'job', field: 'id' }
  ],
  userCheckpoints: [],
  nextProcesses: ['dispatching', 'invoicing'],
  previousProcesses: ['quality_assurance']
};

// ============================================================================
// POST-SERVICE PROCESSES (9-12)
// ============================================================================

export const INVOICING: ProcessDefinition = {
  id: 'invoicing',
  name: 'Invoicing',
  description: 'Generate and send invoices for completed work',
  phase: 'post_service',
  order: 1,
  subSteps: [
    {
      id: 'review_job',
      name: 'Review Completed Job',
      description: 'Verify work completion and billable items',
      tools: ['get_job', 'get_quote']
    },
    {
      id: 'create_invoice',
      name: 'Create Invoice',
      description: 'Generate invoice from job/quote details',
      tools: ['create_invoice', 'create_invoice_line_item']
    },
    {
      id: 'review_invoice',
      name: 'Review Invoice',
      description: 'Verify amounts and details before sending',
      tools: ['get_invoice', 'update_invoice']
    },
    {
      id: 'send_invoice',
      name: 'Send Invoice',
      description: 'Deliver invoice to customer',
      tools: ['send_invoice']
    }
  ],
  tools: [
    'create_invoice',
    'update_invoice',
    'get_invoice',
    'list_invoices',
    'send_invoice',
    'create_invoice_line_item',
    'update_invoice_line_item',
    'delete_invoice_line_item',
    'void_invoice'
  ],
  inputContract: {
    job_id: 'uuid?',
    quote_id: 'uuid?',
    customer_id: 'uuid'
  },
  outputContract: {
    invoice_id: 'uuid',
    invoice_status: 'InvoiceStatus',
    total: 'number'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  exitConditions: [
    { type: 'entity_exists', entity: 'invoice', field: 'id' },
    { type: 'status_equals', entity: 'invoice', field: 'status', value: 'Sent' }
  ],
  userCheckpoints: ['invoice_approval'],
  nextProcesses: ['payment_collection'],
  previousProcesses: ['quality_assurance', 'preventive_maintenance']
};

export const PAYMENT_COLLECTION: ProcessDefinition = {
  id: 'payment_collection',
  name: 'Payment Collection',
  description: 'Collect and process customer payments',
  phase: 'post_service',
  order: 2,
  subSteps: [
    {
      id: 'track_outstanding',
      name: 'Track Outstanding Invoices',
      description: 'Monitor unpaid invoices and aging',
      tools: ['list_invoices', 'get_invoice']
    },
    {
      id: 'send_reminders',
      name: 'Send Payment Reminders',
      description: 'Follow up on overdue payments',
      tools: ['send_invoice', 'send_email']
    },
    {
      id: 'process_payment',
      name: 'Process Payment',
      description: 'Record and process customer payment',
      tools: ['record_payment', 'update_invoice']
    },
    {
      id: 'issue_receipt',
      name: 'Issue Receipt',
      description: 'Send payment confirmation',
      tools: ['send_email']
    }
  ],
  tools: [
    'get_invoice',
    'list_invoices',
    'update_invoice',
    'send_invoice',
    'record_payment',
    'process_refund',
    'send_email'
  ],
  inputContract: {
    invoice_id: 'uuid'
  },
  outputContract: {
    payment_id: 'uuid',
    payment_status: 'PaymentStatus',
    amount_paid: 'number'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'invoice', field: 'id' },
    { type: 'status_equals', entity: 'invoice', field: 'status', value: 'Sent' }
  ],
  exitConditions: [
    { type: 'status_equals', entity: 'invoice', field: 'status', value: 'Paid' }
  ],
  userCheckpoints: [],
  nextProcesses: ['reviews_reputation'],
  previousProcesses: ['invoicing']
};

export const REVIEWS_REPUTATION: ProcessDefinition = {
  id: 'reviews_reputation',
  name: 'Reviews & Reputation',
  description: 'Collect customer feedback and manage online reputation',
  phase: 'post_service',
  order: 3,
  subSteps: [
    {
      id: 'request_review',
      name: 'Request Customer Review',
      description: 'Send review request after service completion',
      tools: ['send_email']
    },
    {
      id: 'monitor_reviews',
      name: 'Monitor Reviews',
      description: 'Track reviews across platforms',
      tools: []  // External integrations
    },
    {
      id: 'respond_reviews',
      name: 'Respond to Reviews',
      description: 'Reply to customer feedback',
      tools: []  // External integrations
    },
    {
      id: 'analyze_feedback',
      name: 'Analyze Feedback',
      description: 'Identify trends and improvement areas',
      tools: []
    }
  ],
  tools: [
    'send_email',
    'get_customer',
    'update_customer'
  ],
  inputContract: {
    job_id: 'uuid',
    customer_id: 'uuid'
  },
  outputContract: {
    review_requested: 'boolean',
    review_received: 'boolean?'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'job', field: 'id' },
    { type: 'status_equals', entity: 'job', field: 'status', value: 'Completed' }
  ],
  exitConditions: [],
  userCheckpoints: [],
  nextProcesses: [],
  previousProcesses: ['payment_collection']
};

export const WARRANTY_MANAGEMENT: ProcessDefinition = {
  id: 'warranty_management',
  name: 'Warranty Management',
  description: 'Handle warranty claims and post-service issues',
  phase: 'post_service',
  order: 4,
  subSteps: [
    {
      id: 'receive_claim',
      name: 'Receive Warranty Claim',
      description: 'Log customer warranty or issue report',
      tools: ['create_request', 'get_job']
    },
    {
      id: 'evaluate_claim',
      name: 'Evaluate Claim',
      description: 'Determine warranty coverage and validity',
      tools: ['get_job', 'get_quote', 'list_jobs']
    },
    {
      id: 'schedule_repair',
      name: 'Schedule Warranty Work',
      description: 'Book return visit if covered',
      tools: ['create_job', 'schedule_job', 'assign_job']
    },
    {
      id: 'resolve_claim',
      name: 'Resolve Claim',
      description: 'Complete warranty work and close claim',
      tools: ['update_job', 'update_request']
    }
  ],
  tools: [
    'create_request',
    'update_request',
    'get_job',
    'list_jobs',
    'create_job',
    'schedule_job',
    'assign_job',
    'update_job'
  ],
  inputContract: {
    customer_id: 'uuid',
    original_job_id: 'uuid?',
    issue_description: 'string'
  },
  outputContract: {
    warranty_job_id: 'uuid?',
    claim_status: 'string',
    covered: 'boolean'
  },
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  exitConditions: [],
  userCheckpoints: ['warranty_approval'],
  nextProcesses: ['dispatching'],
  previousProcesses: ['quality_assurance']
};

// ============================================================================
// OPERATIONS PROCESSES (13-15)
// ============================================================================

export const INVENTORY_MANAGEMENT: ProcessDefinition = {
  id: 'inventory_management',
  name: 'Inventory Management',
  description: 'Track and replenish parts and supplies',
  phase: 'operations',
  order: 1,
  subSteps: [
    {
      id: 'check_levels',
      name: 'Check Inventory Levels',
      description: 'Monitor stock quantities',
      tools: ['get_inventory', 'list_inventory']
    },
    {
      id: 'identify_reorder',
      name: 'Identify Reorder Needs',
      description: 'Flag items below minimum stock',
      tools: ['list_inventory']
    },
    {
      id: 'create_order',
      name: 'Create Purchase Order',
      description: 'Order replenishment stock',
      tools: ['update_inventory']
    },
    {
      id: 'receive_stock',
      name: 'Receive Stock',
      description: 'Record received inventory',
      tools: ['update_inventory']
    },
    {
      id: 'track_usage',
      name: 'Track Usage by Job',
      description: 'Associate inventory with jobs',
      tools: ['update_inventory', 'get_job']
    }
  ],
  tools: [
    'get_inventory',
    'list_inventory',
    'update_inventory',
    'create_inventory_item',
    'delete_inventory_item'
  ],
  inputContract: {},
  outputContract: {
    low_stock_items: 'InventoryItem[]',
    reorder_needed: 'boolean'
  },
  entryConditions: [],
  exitConditions: [],
  userCheckpoints: [],
  nextProcesses: [],
  previousProcesses: []
};

export const REPORTING_ANALYTICS: ProcessDefinition = {
  id: 'reporting_analytics',
  name: 'Reporting & Analytics',
  description: 'Track business performance and generate reports',
  phase: 'operations',
  order: 2,
  subSteps: [
    {
      id: 'collect_data',
      name: 'Collect Performance Data',
      description: 'Aggregate data from all processes',
      tools: ['list_jobs', 'list_invoices', 'list_quotes']
    },
    {
      id: 'generate_reports',
      name: 'Generate Reports',
      description: 'Create financial and operational reports',
      tools: []
    },
    {
      id: 'identify_trends',
      name: 'Identify Trends',
      description: 'Analyze patterns and opportunities',
      tools: []
    },
    {
      id: 'export_data',
      name: 'Export Data',
      description: 'Export for external analysis',
      tools: []
    }
  ],
  tools: [
    'list_jobs',
    'list_invoices',
    'list_quotes',
    'list_customers',
    'list_team_members'
  ],
  inputContract: {
    date_range: 'string?',
    report_type: 'string?'
  },
  outputContract: {
    report_data: 'object'
  },
  entryConditions: [],
  exitConditions: [],
  userCheckpoints: [],
  nextProcesses: [],
  previousProcesses: []
};

export const SEASONAL_PLANNING: ProcessDefinition = {
  id: 'seasonal_planning',
  name: 'Seasonal Planning',
  description: 'Prepare for seasonal demand changes',
  phase: 'operations',
  order: 3,
  subSteps: [
    {
      id: 'analyze_history',
      name: 'Analyze Historical Patterns',
      description: 'Review past seasonal trends',
      tools: ['list_jobs', 'list_invoices']
    },
    {
      id: 'forecast_demand',
      name: 'Forecast Demand',
      description: 'Predict upcoming service needs',
      tools: []
    },
    {
      id: 'plan_capacity',
      name: 'Plan Capacity',
      description: 'Adjust staffing and inventory',
      tools: ['list_team_members', 'list_inventory']
    },
    {
      id: 'prepare_campaigns',
      name: 'Prepare Marketing Campaigns',
      description: 'Ready seasonal promotions',
      tools: []
    }
  ],
  tools: [
    'list_jobs',
    'list_invoices',
    'list_customers',
    'list_team_members',
    'list_inventory'
  ],
  inputContract: {
    season: 'string?',
    year: 'number?'
  },
  outputContract: {
    forecast: 'object',
    recommendations: 'string[]'
  },
  entryConditions: [],
  exitConditions: [],
  userCheckpoints: [],
  nextProcesses: [],
  previousProcesses: []
};

// ============================================================================
// PROCESS REGISTRY
// ============================================================================

export const PROCESS_REGISTRY: Record<string, ProcessDefinition> = {
  // Pre-Service (1-5)
  lead_generation: LEAD_GENERATION,
  customer_communication: CUSTOMER_COMMUNICATION,
  site_assessment: SITE_ASSESSMENT,
  quoting_estimating: QUOTING_ESTIMATING,
  scheduling: SCHEDULING,
  // Service Delivery (6-8)
  dispatching: DISPATCHING,
  quality_assurance: QUALITY_ASSURANCE,
  preventive_maintenance: PREVENTIVE_MAINTENANCE,
  // Post-Service (9-12)
  invoicing: INVOICING,
  payment_collection: PAYMENT_COLLECTION,
  reviews_reputation: REVIEWS_REPUTATION,
  warranty_management: WARRANTY_MANAGEMENT,
  // Operations (13-15)
  inventory_management: INVENTORY_MANAGEMENT,
  reporting_analytics: REPORTING_ANALYTICS,
  seasonal_planning: SEASONAL_PLANNING
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
 * Get the phase a process belongs to
 */
export function getProcessPhase(processId: string): ProcessPhase | null {
  const process = PROCESS_REGISTRY[processId];
  return process ? process.phase : null;
}

/**
 * Get all processes in a phase
 */
export function getPhaseProcesses(phase: ProcessPhase): ProcessDefinition[] {
  return Object.values(PROCESS_REGISTRY)
    .filter(p => p.phase === phase)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get suggested next processes based on current process
 */
export function getNextProcesses(processId: string): ProcessDefinition[] {
  const process = PROCESS_REGISTRY[processId];
  if (!process) return [];
  
  return process.nextProcesses
    .map(id => PROCESS_REGISTRY[id])
    .filter(Boolean);
}

/**
 * Check if a process transition is valid
 */
export function isValidTransition(fromProcessId: string, toProcessId: string): boolean {
  const from = PROCESS_REGISTRY[fromProcessId];
  if (!from) return false;
  
  // Direct next process is always valid
  if (from.nextProcesses.includes(toProcessId)) return true;
  
  // Same phase transition is valid
  const to = PROCESS_REGISTRY[toProcessId];
  if (to && from.phase === to.phase) return true;
  
  // Operations can be accessed from any phase
  if (to && to.phase === 'operations') return true;
  
  return false;
}

/**
 * Get current phase based on active entities/context
 */
export function getCurrentPhase(context: {
  hasQuote?: boolean;
  quoteStatus?: string;
  hasJob?: boolean;
  jobStatus?: string;
  hasInvoice?: boolean;
  invoiceStatus?: string;
}): ProcessPhase {
  // Post-service: has invoice
  if (context.hasInvoice) {
    return 'post_service';
  }
  
  // Service delivery: job in progress
  if (context.hasJob && context.jobStatus === 'In Progress') {
    return 'service_delivery';
  }
  
  // Pre-service: job scheduled or quote in progress
  if (context.hasJob || context.hasQuote) {
    return 'pre_service';
  }
  
  // Default to pre-service
  return 'pre_service';
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

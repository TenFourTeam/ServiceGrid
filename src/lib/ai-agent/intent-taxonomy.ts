/**
 * Intent Taxonomy - Complete classification of all ServiceGrid domains and intents
 * Based on SIPOC process maps covering 12 core business domains
 */

// ============================================================================
// DOMAIN DEFINITIONS
// ============================================================================

export const DOMAINS = [
  'customer_acquisition',
  'service_request',
  'quote_lifecycle',
  'job_management',
  'scheduling',
  'time_tracking',
  'invoicing',
  'payment_processing',
  'recurring_billing',
  'team_management',
  'checklists',
  'customer_portal',
] as const;

export type Domain = typeof DOMAINS[number];

export const DOMAIN_METADATA: Record<Domain, DomainMetadata> = {
  customer_acquisition: {
    label: 'Customer Acquisition',
    description: 'Managing customer records, imports, and CRM',
    icon: 'Users',
    primaryRoutes: ['/customers'],
    keywords: ['customer', 'client', 'contact', 'lead', 'import', 'crm'],
  },
  service_request: {
    label: 'Service Requests',
    description: 'Handling incoming service requests and triage',
    icon: 'Inbox',
    primaryRoutes: ['/requests'],
    keywords: ['request', 'inquiry', 'lead', 'triage', 'submission'],
  },
  quote_lifecycle: {
    label: 'Quote Lifecycle',
    description: 'Creating, sending, and managing quotes',
    icon: 'FileText',
    primaryRoutes: ['/quotes'],
    keywords: ['quote', 'estimate', 'proposal', 'pricing', 'bid'],
  },
  job_management: {
    label: 'Job Management',
    description: 'Creating and managing work orders',
    icon: 'Briefcase',
    primaryRoutes: ['/work-orders'],
    keywords: ['job', 'work order', 'task', 'assignment', 'project'],
  },
  scheduling: {
    label: 'Scheduling',
    description: 'Calendar management and route optimization',
    icon: 'Calendar',
    primaryRoutes: ['/calendar', '/work-orders'],
    keywords: ['schedule', 'calendar', 'book', 'slot', 'route', 'optimize', 'availability'],
  },
  time_tracking: {
    label: 'Time Tracking',
    description: 'Clock in/out and timesheet management',
    icon: 'Clock',
    primaryRoutes: ['/team'],
    keywords: ['clock', 'time', 'hours', 'timesheet', 'punch'],
  },
  invoicing: {
    label: 'Invoicing',
    description: 'Creating and sending invoices',
    icon: 'Receipt',
    primaryRoutes: ['/invoices'],
    keywords: ['invoice', 'bill', 'charge', 'due', 'outstanding'],
  },
  payment_processing: {
    label: 'Payment Processing',
    description: 'Recording and processing payments',
    icon: 'CreditCard',
    primaryRoutes: ['/invoices'],
    keywords: ['payment', 'pay', 'paid', 'collect', 'stripe', 'card', 'check'],
  },
  recurring_billing: {
    label: 'Recurring Billing',
    description: 'Managing subscriptions and recurring invoices',
    icon: 'Repeat',
    primaryRoutes: ['/invoices'],
    keywords: ['recurring', 'subscription', 'monthly', 'weekly', 'auto-bill'],
  },
  team_management: {
    label: 'Team Management',
    description: 'Team members, roles, and availability',
    icon: 'UserCog',
    primaryRoutes: ['/team'],
    keywords: ['team', 'member', 'staff', 'employee', 'role', 'invite', 'availability'],
  },
  checklists: {
    label: 'Checklists',
    description: 'Task templates and completion tracking',
    icon: 'CheckSquare',
    primaryRoutes: ['/checklists', '/work-orders'],
    keywords: ['checklist', 'task', 'template', 'complete', 'progress'],
  },
  customer_portal: {
    label: 'Customer Portal',
    description: 'Customer self-service and messaging',
    icon: 'Globe',
    primaryRoutes: ['/customers'],
    keywords: ['portal', 'invite', 'self-service', 'customer message'],
  },
};

export interface DomainMetadata {
  label: string;
  description: string;
  icon: string;
  primaryRoutes: string[];
  keywords: string[];
}

// ============================================================================
// INTENT DEFINITIONS
// ============================================================================

export interface IntentDefinition {
  id: string;
  domain: Domain;
  label: string;
  description: string;
  category: IntentCategory;
  patterns: string[]; // Regex patterns or keyword phrases
  examples: string[];
  requiredEntities: EntityType[];
  optionalEntities: EntityType[];
  toolsUsed: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
}

export type IntentCategory = 'create' | 'read' | 'update' | 'delete' | 'action' | 'query' | 'navigate';

// ============================================================================
// COMPLETE INTENT REGISTRY
// ============================================================================

export const INTENT_REGISTRY: IntentDefinition[] = [
  // -------------------------------------------------------------------------
  // CUSTOMER ACQUISITION DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'create_customer',
    domain: 'customer_acquisition',
    label: 'Create Customer',
    description: 'Create a new customer record',
    category: 'create',
    patterns: [
      'add.*customer',
      'create.*customer',
      'new.*customer',
      'add.*client',
      'create.*client',
    ],
    examples: [
      'Add a new customer named John Smith',
      'Create customer for ABC Company',
      'I need to add a new client',
    ],
    requiredEntities: ['customer_name'],
    optionalEntities: ['email', 'phone', 'address'],
    toolsUsed: ['create_customer'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'search_customer',
    domain: 'customer_acquisition',
    label: 'Search Customer',
    description: 'Find a customer by name, email, or phone',
    category: 'query',
    patterns: [
      'find.*customer',
      'search.*customer',
      'look up.*customer',
      'who is.*customer',
      'find.*client',
    ],
    examples: [
      'Find customer John Smith',
      'Search for the Johnson account',
      'Look up customer by email',
    ],
    requiredEntities: [],
    optionalEntities: ['customer_name', 'email', 'phone'],
    toolsUsed: ['search_customers'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'update_customer',
    domain: 'customer_acquisition',
    label: 'Update Customer',
    description: 'Update customer information',
    category: 'update',
    patterns: [
      'update.*customer',
      'change.*customer',
      'edit.*customer',
      'modify.*customer',
    ],
    examples: [
      'Update the phone number for John Smith',
      'Change customer address to 123 Main St',
      'Edit customer notes',
    ],
    requiredEntities: ['customer_id'],
    optionalEntities: ['customer_name', 'email', 'phone', 'address'],
    toolsUsed: ['update_customer'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'view_customer_history',
    domain: 'customer_acquisition',
    label: 'View Customer History',
    description: 'View jobs, quotes, and invoices for a customer',
    category: 'read',
    patterns: [
      'show.*customer.*history',
      'customer.*jobs',
      'customer.*quotes',
      'what.*done.*for',
    ],
    examples: [
      'Show me all jobs for customer Johnson',
      'What have we done for ABC Company?',
      'View customer history',
    ],
    requiredEntities: ['customer_id'],
    optionalEntities: [],
    toolsUsed: ['get_customer_history'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'import_customers',
    domain: 'customer_acquisition',
    label: 'Import Customers',
    description: 'Bulk import customers from CSV',
    category: 'action',
    patterns: [
      'import.*customers',
      'bulk.*add.*customers',
      'upload.*customer.*list',
    ],
    examples: [
      'Import customers from CSV',
      'Bulk add customer list',
    ],
    requiredEntities: [],
    optionalEntities: [],
    toolsUsed: ['import_customers'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },

  // -------------------------------------------------------------------------
  // SERVICE REQUEST DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'create_request',
    domain: 'service_request',
    label: 'Create Request',
    description: 'Create a new service request',
    category: 'create',
    patterns: [
      'create.*request',
      'new.*request',
      'add.*request',
      'log.*request',
    ],
    examples: [
      'Create a new service request for Johnson',
      'Log a request for plumbing repair',
    ],
    requiredEntities: ['customer_id'],
    optionalEntities: ['service_type', 'description', 'preferred_date'],
    toolsUsed: ['create_request'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'triage_request',
    domain: 'service_request',
    label: 'Triage Request',
    description: 'Review and prioritize a request',
    category: 'action',
    patterns: [
      'triage.*request',
      'review.*request',
      'prioritize.*request',
    ],
    examples: [
      'Triage the pending requests',
      'Review new request submissions',
    ],
    requiredEntities: [],
    optionalEntities: ['request_id'],
    toolsUsed: ['get_pending_requests', 'update_request_status'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'convert_request_to_job',
    domain: 'service_request',
    label: 'Convert to Job',
    description: 'Convert a request into a scheduled job',
    category: 'action',
    patterns: [
      'convert.*request.*job',
      'turn.*request.*job',
      'make.*job.*from.*request',
    ],
    examples: [
      'Convert this request to a job',
      'Turn the Johnson request into a work order',
    ],
    requiredEntities: ['request_id'],
    optionalEntities: ['scheduled_date', 'assigned_to'],
    toolsUsed: ['convert_request_to_job'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },

  // -------------------------------------------------------------------------
  // QUOTE LIFECYCLE DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'create_quote',
    domain: 'quote_lifecycle',
    label: 'Create Quote',
    description: 'Create a new quote for a customer',
    category: 'create',
    patterns: [
      'create.*quote',
      'new.*quote',
      'make.*quote',
      'prepare.*estimate',
      'draft.*proposal',
    ],
    examples: [
      'Create a quote for Johnson',
      'Make a new estimate for the kitchen remodel',
      'Prepare a proposal for ABC Company',
    ],
    requiredEntities: ['customer_id'],
    optionalEntities: ['line_items', 'valid_until', 'notes'],
    toolsUsed: ['create_quote'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'send_quote',
    domain: 'quote_lifecycle',
    label: 'Send Quote',
    description: 'Send a quote to the customer via email',
    category: 'action',
    patterns: [
      'send.*quote',
      'email.*quote',
      'deliver.*quote',
    ],
    examples: [
      'Send the quote to the customer',
      'Email quote #1234 to Johnson',
    ],
    requiredEntities: ['quote_id'],
    optionalEntities: ['message'],
    toolsUsed: ['send_quote'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'approve_quote',
    domain: 'quote_lifecycle',
    label: 'Approve Quote',
    description: 'Mark a quote as approved',
    category: 'action',
    patterns: [
      'approve.*quote',
      'accept.*quote',
      'customer.*accepted',
    ],
    examples: [
      'Approve quote #1234',
      'Mark the Johnson quote as accepted',
    ],
    requiredEntities: ['quote_id'],
    optionalEntities: ['signature'],
    toolsUsed: ['approve_quote'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'convert_quote_to_job',
    domain: 'quote_lifecycle',
    label: 'Convert Quote to Job',
    description: 'Convert an approved quote to a work order',
    category: 'action',
    patterns: [
      'convert.*quote.*job',
      'turn.*quote.*job',
      'create.*job.*from.*quote',
    ],
    examples: [
      'Convert quote #1234 to a job',
      'Create a work order from the approved quote',
    ],
    requiredEntities: ['quote_id'],
    optionalEntities: ['scheduled_date'],
    toolsUsed: ['convert_quote_to_job'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'revise_quote',
    domain: 'quote_lifecycle',
    label: 'Revise Quote',
    description: 'Create a revision of an existing quote',
    category: 'update',
    patterns: [
      'revise.*quote',
      'update.*quote',
      'modify.*quote',
      'change.*quote',
    ],
    examples: [
      'Revise quote #1234',
      'Update the pricing on the Johnson quote',
    ],
    requiredEntities: ['quote_id'],
    optionalEntities: ['line_items', 'notes'],
    toolsUsed: ['revise_quote'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // -------------------------------------------------------------------------
  // JOB MANAGEMENT DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'create_job',
    domain: 'job_management',
    label: 'Create Job',
    description: 'Create a new work order',
    category: 'create',
    patterns: [
      'create.*job',
      'new.*job',
      'add.*work order',
      'create.*work order',
    ],
    examples: [
      'Create a new job for Johnson',
      'Add a work order for roof repair',
    ],
    requiredEntities: ['customer_id'],
    optionalEntities: ['title', 'address', 'notes', 'scheduled_date'],
    toolsUsed: ['create_job'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'update_job_status',
    domain: 'job_management',
    label: 'Update Job Status',
    description: 'Change the status of a job',
    category: 'update',
    patterns: [
      'update.*job.*status',
      'mark.*job.*complete',
      'close.*job',
      'start.*job',
      'complete.*job',
    ],
    examples: [
      'Mark job #123 as complete',
      'Update the Johnson job to in progress',
      'Close out the completed jobs',
    ],
    requiredEntities: ['job_id'],
    optionalEntities: ['status'],
    toolsUsed: ['update_job_status'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'assign_job',
    domain: 'job_management',
    label: 'Assign Job',
    description: 'Assign team members to a job',
    category: 'update',
    patterns: [
      'assign.*job',
      'assign.*to.*job',
      'put.*on.*job',
      'give.*job.*to',
    ],
    examples: [
      'Assign Mike to the Johnson job',
      'Put Sarah on job #123',
    ],
    requiredEntities: ['job_id', 'user_id'],
    optionalEntities: [],
    toolsUsed: ['assign_job'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'view_job_details',
    domain: 'job_management',
    label: 'View Job Details',
    description: 'Get details about a specific job',
    category: 'read',
    patterns: [
      'show.*job',
      'view.*job',
      'what.*about.*job',
      'job.*details',
      'tell.*about.*job',
    ],
    examples: [
      'Show me job #123',
      'What are the details for the Johnson job?',
    ],
    requiredEntities: ['job_id'],
    optionalEntities: [],
    toolsUsed: ['get_job_details'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'add_job_notes',
    domain: 'job_management',
    label: 'Add Job Notes',
    description: 'Add notes or comments to a job',
    category: 'update',
    patterns: [
      'add.*note.*job',
      'note.*on.*job',
      'comment.*job',
    ],
    examples: [
      'Add a note to job #123: Customer requested morning appointment',
      'Note on the Johnson job: needs follow-up',
    ],
    requiredEntities: ['job_id', 'note_content'],
    optionalEntities: [],
    toolsUsed: ['add_job_note'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'upload_job_media',
    domain: 'job_management',
    label: 'Upload Job Media',
    description: 'Upload photos or videos to a job',
    category: 'action',
    patterns: [
      'upload.*photo.*job',
      'add.*image.*job',
      'attach.*photo',
    ],
    examples: [
      'Upload photos to job #123',
      'Add before/after images to the Johnson job',
    ],
    requiredEntities: ['job_id'],
    optionalEntities: ['media_files'],
    toolsUsed: ['upload_job_media'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // -------------------------------------------------------------------------
  // SCHEDULING DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'schedule_job',
    domain: 'scheduling',
    label: 'Schedule Job',
    description: 'Schedule a single job to a specific time',
    category: 'action',
    patterns: [
      'schedule.*job',
      'book.*job',
      'set.*job.*time',
      'when.*can.*schedule',
    ],
    examples: [
      'Schedule the Johnson job for tomorrow at 9am',
      'Book job #123 for next Monday',
    ],
    requiredEntities: ['job_id', 'datetime'],
    optionalEntities: ['user_id', 'duration'],
    toolsUsed: ['schedule_job'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'batch_schedule',
    domain: 'scheduling',
    label: 'Batch Schedule',
    description: 'Schedule multiple jobs optimally',
    category: 'action',
    patterns: [
      'batch.*schedule',
      'schedule.*all',
      'auto.*schedule',
      'schedule.*unscheduled',
      'optimize.*schedule',
    ],
    examples: [
      'Schedule all unscheduled jobs for this week',
      'Batch schedule the pending jobs',
      'Auto-schedule jobs for next week',
    ],
    requiredEntities: ['date_range'],
    optionalEntities: ['job_ids', 'user_ids'],
    toolsUsed: ['batch_schedule_jobs', 'get_unscheduled_jobs', 'check_team_availability'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'reschedule_job',
    domain: 'scheduling',
    label: 'Reschedule Job',
    description: 'Move a job to a different time',
    category: 'update',
    patterns: [
      'reschedule.*job',
      'move.*job',
      'change.*job.*time',
      'push.*job',
    ],
    examples: [
      'Reschedule job #123 to next Tuesday',
      'Move the Johnson job to 2pm',
    ],
    requiredEntities: ['job_id', 'datetime'],
    optionalEntities: [],
    toolsUsed: ['reschedule_job'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'check_availability',
    domain: 'scheduling',
    label: 'Check Availability',
    description: 'Check team member availability',
    category: 'query',
    patterns: [
      'check.*availability',
      'who.*available',
      'when.*available',
      'free.*slots',
      'open.*time',
    ],
    examples: [
      'Check availability for next week',
      'Who is available tomorrow morning?',
      'When is Mike free?',
    ],
    requiredEntities: [],
    optionalEntities: ['user_id', 'date_range'],
    toolsUsed: ['check_team_availability'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'optimize_route',
    domain: 'scheduling',
    label: 'Optimize Route',
    description: 'Optimize job order for minimal travel',
    category: 'action',
    patterns: [
      'optimize.*route',
      'best.*route',
      'shortest.*route',
      'plan.*route',
    ],
    examples: [
      'Optimize the route for tomorrow',
      'What is the best route for these jobs?',
    ],
    requiredEntities: ['date'],
    optionalEntities: ['user_id', 'job_ids'],
    toolsUsed: ['optimize_route_for_date'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'get_capacity',
    domain: 'scheduling',
    label: 'Get Capacity',
    description: 'View scheduling capacity and utilization',
    category: 'query',
    patterns: [
      'capacity',
      'utilization',
      'how.*busy',
      'how.*booked',
    ],
    examples: [
      'What is our capacity this week?',
      'How busy are we next month?',
    ],
    requiredEntities: ['date_range'],
    optionalEntities: [],
    toolsUsed: ['get_scheduling_capacity'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // -------------------------------------------------------------------------
  // TIME TRACKING DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'clock_in',
    domain: 'time_tracking',
    label: 'Clock In',
    description: 'Start time tracking for a job',
    category: 'action',
    patterns: [
      'clock in',
      'start.*time',
      'punch in',
      'begin.*work',
    ],
    examples: [
      'Clock in to job #123',
      'Start time tracking',
      'Punch in for the Johnson job',
    ],
    requiredEntities: [],
    optionalEntities: ['job_id'],
    toolsUsed: ['clock_in'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'clock_out',
    domain: 'time_tracking',
    label: 'Clock Out',
    description: 'Stop time tracking',
    category: 'action',
    patterns: [
      'clock out',
      'stop.*time',
      'punch out',
      'end.*work',
    ],
    examples: [
      'Clock out',
      'Stop time tracking',
      'End my shift',
    ],
    requiredEntities: [],
    optionalEntities: ['notes'],
    toolsUsed: ['clock_out'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'log_time',
    domain: 'time_tracking',
    label: 'Log Time',
    description: 'Manually log time worked',
    category: 'create',
    patterns: [
      'log.*time',
      'add.*hours',
      'record.*time',
      'enter.*time',
    ],
    examples: [
      'Log 2 hours for job #123',
      'Add 4 hours to yesterday',
    ],
    requiredEntities: ['duration'],
    optionalEntities: ['job_id', 'date', 'notes'],
    toolsUsed: ['log_time_entry'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'view_timesheet',
    domain: 'time_tracking',
    label: 'View Timesheet',
    description: 'View time entries and totals',
    category: 'read',
    patterns: [
      'show.*timesheet',
      'view.*time',
      'hours.*worked',
      'time.*report',
    ],
    examples: [
      'Show my timesheet for this week',
      'How many hours have I worked?',
    ],
    requiredEntities: [],
    optionalEntities: ['user_id', 'date_range'],
    toolsUsed: ['get_timesheet'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // -------------------------------------------------------------------------
  // INVOICING DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'create_invoice',
    domain: 'invoicing',
    label: 'Create Invoice',
    description: 'Create a new invoice',
    category: 'create',
    patterns: [
      'create.*invoice',
      'new.*invoice',
      'make.*invoice',
      'bill.*customer',
    ],
    examples: [
      'Create an invoice for job #123',
      'Bill Johnson for the completed work',
    ],
    requiredEntities: ['customer_id'],
    optionalEntities: ['job_id', 'quote_id', 'line_items'],
    toolsUsed: ['create_invoice'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'send_invoice',
    domain: 'invoicing',
    label: 'Send Invoice',
    description: 'Send an invoice to the customer',
    category: 'action',
    patterns: [
      'send.*invoice',
      'email.*invoice',
      'deliver.*invoice',
    ],
    examples: [
      'Send invoice #1234 to the customer',
      'Email the Johnson invoice',
    ],
    requiredEntities: ['invoice_id'],
    optionalEntities: ['message'],
    toolsUsed: ['send_invoice'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'void_invoice',
    domain: 'invoicing',
    label: 'Void Invoice',
    description: 'Void an existing invoice',
    category: 'delete',
    patterns: [
      'void.*invoice',
      'cancel.*invoice',
      'delete.*invoice',
    ],
    examples: [
      'Void invoice #1234',
      'Cancel the duplicate invoice',
    ],
    requiredEntities: ['invoice_id'],
    optionalEntities: ['reason'],
    toolsUsed: ['void_invoice'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },
  {
    id: 'invoice_reminder',
    domain: 'invoicing',
    label: 'Send Reminder',
    description: 'Send a payment reminder',
    category: 'action',
    patterns: [
      'send.*reminder',
      'remind.*payment',
      'follow up.*invoice',
    ],
    examples: [
      'Send a reminder for invoice #1234',
      'Follow up on overdue invoices',
    ],
    requiredEntities: [],
    optionalEntities: ['invoice_id'],
    toolsUsed: ['send_invoice_reminder'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },

  // -------------------------------------------------------------------------
  // PAYMENT PROCESSING DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'record_payment',
    domain: 'payment_processing',
    label: 'Record Payment',
    description: 'Record a payment received',
    category: 'create',
    patterns: [
      'record.*payment',
      'log.*payment',
      'customer.*paid',
      'received.*payment',
    ],
    examples: [
      'Record a $500 payment for invoice #1234',
      'Johnson paid with check',
    ],
    requiredEntities: ['invoice_id', 'amount'],
    optionalEntities: ['payment_method', 'notes'],
    toolsUsed: ['record_payment'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'process_stripe_payment',
    domain: 'payment_processing',
    label: 'Process Card Payment',
    description: 'Process a credit card payment via Stripe',
    category: 'action',
    patterns: [
      'process.*payment',
      'charge.*card',
      'run.*payment',
    ],
    examples: [
      'Process payment for invoice #1234',
      'Charge the customer card',
    ],
    requiredEntities: ['invoice_id'],
    optionalEntities: ['amount'],
    toolsUsed: ['process_stripe_payment'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },
  {
    id: 'refund_payment',
    domain: 'payment_processing',
    label: 'Refund Payment',
    description: 'Issue a refund',
    category: 'action',
    patterns: [
      'refund.*payment',
      'issue.*refund',
      'return.*money',
    ],
    examples: [
      'Refund $100 to Johnson',
      'Issue a refund for payment #456',
    ],
    requiredEntities: ['payment_id'],
    optionalEntities: ['amount', 'reason'],
    toolsUsed: ['refund_payment'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },

  // -------------------------------------------------------------------------
  // RECURRING BILLING DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'create_recurring_schedule',
    domain: 'recurring_billing',
    label: 'Create Recurring Schedule',
    description: 'Set up a recurring billing schedule',
    category: 'create',
    patterns: [
      'create.*recurring',
      'set up.*subscription',
      'recurring.*billing',
      'monthly.*billing',
    ],
    examples: [
      'Set up monthly billing for Johnson',
      'Create a recurring schedule from quote #1234',
    ],
    requiredEntities: ['quote_id'],
    optionalEntities: ['frequency', 'start_date'],
    toolsUsed: ['create_recurring_schedule'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'pause_subscription',
    domain: 'recurring_billing',
    label: 'Pause Subscription',
    description: 'Temporarily pause recurring billing',
    category: 'action',
    patterns: [
      'pause.*subscription',
      'pause.*recurring',
      'hold.*billing',
    ],
    examples: [
      'Pause the Johnson subscription',
      'Hold recurring billing for account #123',
    ],
    requiredEntities: ['schedule_id'],
    optionalEntities: ['resume_date'],
    toolsUsed: ['pause_subscription'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'resume_subscription',
    domain: 'recurring_billing',
    label: 'Resume Subscription',
    description: 'Resume a paused subscription',
    category: 'action',
    patterns: [
      'resume.*subscription',
      'resume.*recurring',
      'restart.*billing',
    ],
    examples: [
      'Resume the Johnson subscription',
      'Restart billing for account #123',
    ],
    requiredEntities: ['schedule_id'],
    optionalEntities: [],
    toolsUsed: ['resume_subscription'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'cancel_subscription',
    domain: 'recurring_billing',
    label: 'Cancel Subscription',
    description: 'Cancel recurring billing',
    category: 'action',
    patterns: [
      'cancel.*subscription',
      'cancel.*recurring',
      'stop.*billing',
      'end.*subscription',
    ],
    examples: [
      'Cancel the Johnson subscription',
      'Stop recurring billing for account #123',
    ],
    requiredEntities: ['schedule_id'],
    optionalEntities: ['reason'],
    toolsUsed: ['cancel_subscription'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },

  // -------------------------------------------------------------------------
  // TEAM MANAGEMENT DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'invite_member',
    domain: 'team_management',
    label: 'Invite Team Member',
    description: 'Invite a new team member',
    category: 'create',
    patterns: [
      'invite.*member',
      'add.*team',
      'invite.*employee',
      'onboard.*staff',
    ],
    examples: [
      'Invite john@email.com to the team',
      'Add a new team member',
    ],
    requiredEntities: ['email'],
    optionalEntities: ['role', 'name'],
    toolsUsed: ['invite_team_member'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'manage_availability',
    domain: 'team_management',
    label: 'Manage Availability',
    description: 'Set team member availability',
    category: 'update',
    patterns: [
      'set.*availability',
      'update.*schedule',
      'working.*hours',
    ],
    examples: [
      'Set Mike as available Monday through Friday 9-5',
      'Update Sarah schedule',
    ],
    requiredEntities: ['user_id'],
    optionalEntities: ['availability_schedule'],
    toolsUsed: ['update_availability'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'request_time_off',
    domain: 'team_management',
    label: 'Request Time Off',
    description: 'Request time off',
    category: 'create',
    patterns: [
      'request.*time off',
      'request.*vacation',
      'request.*pto',
      'need.*day off',
    ],
    examples: [
      'Request time off next Friday',
      'I need vacation Dec 23-27',
    ],
    requiredEntities: ['date_range'],
    optionalEntities: ['reason'],
    toolsUsed: ['request_time_off'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'approve_time_off',
    domain: 'team_management',
    label: 'Approve Time Off',
    description: 'Approve a time off request',
    category: 'action',
    patterns: [
      'approve.*time off',
      'approve.*vacation',
      'approve.*pto',
    ],
    examples: [
      'Approve Mike time off request',
      'Approve all pending time off',
    ],
    requiredEntities: [],
    optionalEntities: ['request_id', 'user_id'],
    toolsUsed: ['approve_time_off'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'view_utilization',
    domain: 'team_management',
    label: 'View Utilization',
    description: 'View team utilization metrics',
    category: 'query',
    patterns: [
      'utilization',
      'productivity',
      'how.*team.*doing',
      'performance.*report',
    ],
    examples: [
      'Show team utilization for this month',
      'How is the team doing?',
    ],
    requiredEntities: [],
    optionalEntities: ['user_id', 'date_range'],
    toolsUsed: ['get_team_utilization'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // -------------------------------------------------------------------------
  // CHECKLISTS DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'create_checklist_template',
    domain: 'checklists',
    label: 'Create Checklist Template',
    description: 'Create a reusable checklist template',
    category: 'create',
    patterns: [
      'create.*checklist.*template',
      'new.*template',
      'make.*checklist',
    ],
    examples: [
      'Create a cleaning checklist template',
      'Make a new inspection template',
    ],
    requiredEntities: ['template_name'],
    optionalEntities: ['items'],
    toolsUsed: ['create_checklist_template'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'assign_checklist',
    domain: 'checklists',
    label: 'Assign Checklist',
    description: 'Assign a checklist to a job',
    category: 'action',
    patterns: [
      'assign.*checklist',
      'add.*checklist.*job',
      'attach.*checklist',
    ],
    examples: [
      'Assign the cleaning checklist to job #123',
      'Add inspection checklist to the Johnson job',
    ],
    requiredEntities: ['job_id', 'template_id'],
    optionalEntities: ['assigned_to'],
    toolsUsed: ['assign_checklist'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'complete_task',
    domain: 'checklists',
    label: 'Complete Task',
    description: 'Mark a checklist task as complete',
    category: 'update',
    patterns: [
      'complete.*task',
      'finish.*task',
      'mark.*done',
      'check off',
    ],
    examples: [
      'Complete the first task on the checklist',
      'Mark "Clean windows" as done',
    ],
    requiredEntities: ['task_id'],
    optionalEntities: ['notes', 'photo'],
    toolsUsed: ['complete_checklist_task'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'generate_checklist_from_photo',
    domain: 'checklists',
    label: 'Generate Checklist from Photo',
    description: 'Use AI to generate a checklist from a job site photo',
    category: 'action',
    patterns: [
      'generate.*checklist.*photo',
      'ai.*checklist',
      'create.*checklist.*image',
    ],
    examples: [
      'Generate a checklist from this photo',
      'Use AI to create tasks from the job site image',
    ],
    requiredEntities: ['media_id'],
    optionalEntities: ['job_id'],
    toolsUsed: ['generate_checklist_from_photo'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'view_checklist_progress',
    domain: 'checklists',
    label: 'View Checklist Progress',
    description: 'View progress on a checklist',
    category: 'read',
    patterns: [
      'checklist.*progress',
      'how.*checklist',
      'status.*checklist',
    ],
    examples: [
      'Show checklist progress for job #123',
      'How is the cleaning checklist going?',
    ],
    requiredEntities: [],
    optionalEntities: ['job_id', 'checklist_id'],
    toolsUsed: ['get_checklist_progress'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // -------------------------------------------------------------------------
  // CUSTOMER PORTAL DOMAIN
  // -------------------------------------------------------------------------
  {
    id: 'send_portal_invite',
    domain: 'customer_portal',
    label: 'Send Portal Invite',
    description: 'Invite a customer to the self-service portal',
    category: 'action',
    patterns: [
      'invite.*portal',
      'send.*portal.*invite',
      'give.*access',
    ],
    examples: [
      'Invite Johnson to the customer portal',
      'Send portal access to the customer',
    ],
    requiredEntities: ['customer_id'],
    optionalEntities: [],
    toolsUsed: ['send_portal_invite'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'view_portal_messages',
    domain: 'customer_portal',
    label: 'View Portal Messages',
    description: 'View messages from customers',
    category: 'read',
    patterns: [
      'customer.*messages',
      'portal.*messages',
      'what.*customers.*saying',
    ],
    examples: [
      'Show customer messages',
      'What messages do I have?',
    ],
    requiredEntities: [],
    optionalEntities: ['customer_id'],
    toolsUsed: ['get_customer_messages'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'reply_to_customer',
    domain: 'customer_portal',
    label: 'Reply to Customer',
    description: 'Reply to a customer message',
    category: 'action',
    patterns: [
      'reply.*customer',
      'message.*customer',
      'respond.*customer',
    ],
    examples: [
      'Reply to Johnson: We will be there at 9am',
      'Message the customer about the delay',
    ],
    requiredEntities: ['customer_id', 'message_content'],
    optionalEntities: ['conversation_id'],
    toolsUsed: ['send_customer_message'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
];

// ============================================================================
// ENTITY TYPES
// ============================================================================

export type EntityType =
  | 'customer_id'
  | 'customer_name'
  | 'job_id'
  | 'job_ids'
  | 'quote_id'
  | 'invoice_id'
  | 'schedule_id'
  | 'request_id'
  | 'payment_id'
  | 'template_id'
  | 'template_name'
  | 'checklist_id'
  | 'task_id'
  | 'user_id'
  | 'user_ids'
  | 'media_id'
  | 'media_files'
  | 'conversation_id'
  | 'email'
  | 'phone'
  | 'address'
  | 'datetime'
  | 'date'
  | 'date_range'
  | 'time'
  | 'duration'
  | 'amount'
  | 'percentage'
  | 'status'
  | 'priority'
  | 'line_items'
  | 'items'
  | 'note_content'
  | 'notes'
  | 'message'
  | 'message_content'
  | 'service_type'
  | 'description'
  | 'reason'
  | 'frequency'
  | 'payment_method'
  | 'role'
  | 'name'
  | 'title'
  | 'signature'
  | 'photo'
  | 'valid_until'
  | 'scheduled_date'
  | 'start_date'
  | 'resume_date'
  | 'assigned_to'
  | 'preferred_date'
  | 'availability_schedule';

export interface ExtractedEntity {
  type: EntityType;
  value: string | number | Date | object;
  confidence: number;
  rawText: string;
  position: { start: number; end: number };
}

// ============================================================================
// CLASSIFICATION RESULT
// ============================================================================

export interface ClassifiedIntent {
  domain: Domain;
  intent: string;
  intentDef: IntentDefinition;
  confidence: number;
  entities: Record<EntityType, ExtractedEntity>;
  possibleIntents: Array<{
    intent: IntentDefinition;
    confidence: number;
    label: string;
    description: string;
  }>;
  requiredContext: string[];
  rawInput: string;
  timestamp: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getIntentsByDomain(domain: Domain): IntentDefinition[] {
  return INTENT_REGISTRY.filter(intent => intent.domain === domain);
}

export function getIntent(intentId: string): IntentDefinition | undefined {
  return INTENT_REGISTRY.find(intent => intent.id === intentId);
}

export function getDomainFromRoute(route: string): Domain | undefined {
  for (const [domain, metadata] of Object.entries(DOMAIN_METADATA)) {
    if (metadata.primaryRoutes.some(r => route.startsWith(r))) {
      return domain as Domain;
    }
  }
  return undefined;
}

export function getHighRiskIntents(): IntentDefinition[] {
  return INTENT_REGISTRY.filter(intent => intent.riskLevel === 'high');
}

export function getConfirmationRequiredIntents(): IntentDefinition[] {
  return INTENT_REGISTRY.filter(intent => intent.requiresConfirmation);
}

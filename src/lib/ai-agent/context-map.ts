/**
 * AI Agent Context Map Registry
 * 
 * Defines all data sources required for each process step across all domains.
 * Used by the AI agent to dynamically fetch and populate prompt templates.
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type DataSourceType = 
  | 'database'      // Direct Supabase query
  | 'edge_function' // Edge function call
  | 'session'       // Current session/auth context
  | 'derived'       // Computed from other sources
  | 'realtime'      // Live subscription data
  | 'external';     // External API (Google Maps, Stripe, etc.)

export type ContextPriority = 'required' | 'recommended' | 'optional';

export interface ContextField {
  name: string;
  type: string;
  description: string;
  source: DataSourceType;
  sourceDetail: string;  // Table name, function name, or derivation logic
  priority: ContextPriority;
  cacheDuration?: number; // seconds, undefined = no cache
  dependencies?: string[]; // Other context fields this depends on
}

export interface ProcessStepContext {
  stepId: string;
  stepName: string;
  description: string;
  fields: ContextField[];
  preConditions?: string[];
  postConditions?: string[];
}

export interface DomainContext {
  domainId: string;
  domainName: string;
  description: string;
  steps: ProcessStepContext[];
  sharedContext: ContextField[]; // Context available across all steps
}

// =============================================================================
// SHARED CONTEXT DEFINITIONS
// =============================================================================

const BUSINESS_CONTEXT: ContextField[] = [
  {
    name: 'business_id',
    type: 'string',
    description: 'Current business UUID',
    source: 'session',
    sourceDetail: 'businessContext.businessId',
    priority: 'required',
  },
  {
    name: 'business_name',
    type: 'string',
    description: 'Business display name',
    source: 'database',
    sourceDetail: 'businesses.name',
    priority: 'required',
    cacheDuration: 3600,
  },
  {
    name: 'user_id',
    type: 'string',
    description: 'Current user profile ID',
    source: 'session',
    sourceDetail: 'profile.id',
    priority: 'required',
  },
  {
    name: 'user_name',
    type: 'string',
    description: 'Current user full name',
    source: 'session',
    sourceDetail: 'profile.full_name',
    priority: 'required',
  },
  {
    name: 'user_role',
    type: "'owner' | 'admin' | 'worker'",
    description: 'User role in business',
    source: 'derived',
    sourceDetail: 'businesses.owner_id === user_id ? "owner" : "worker"',
    priority: 'required',
  },
  {
    name: 'tax_rate_default',
    type: 'number',
    description: 'Default tax rate for business',
    source: 'database',
    sourceDetail: 'businesses.tax_rate_default',
    priority: 'optional',
    cacheDuration: 3600,
  },
];

const CUSTOMER_CONTEXT: ContextField[] = [
  {
    name: 'customer_id',
    type: 'string',
    description: 'Customer UUID',
    source: 'database',
    sourceDetail: 'customers.id',
    priority: 'required',
  },
  {
    name: 'customer_name',
    type: 'string',
    description: 'Customer display name',
    source: 'database',
    sourceDetail: 'customers.name',
    priority: 'required',
  },
  {
    name: 'customer_email',
    type: 'string',
    description: 'Customer email address',
    source: 'database',
    sourceDetail: 'customers.email',
    priority: 'required',
  },
  {
    name: 'customer_phone',
    type: 'string | null',
    description: 'Customer phone number',
    source: 'database',
    sourceDetail: 'customers.phone',
    priority: 'optional',
  },
  {
    name: 'customer_address',
    type: 'string | null',
    description: 'Customer default address',
    source: 'database',
    sourceDetail: 'customers.address',
    priority: 'optional',
  },
  {
    name: 'customer_notes',
    type: 'string | null',
    description: 'Internal notes about customer',
    source: 'database',
    sourceDetail: 'customers.notes',
    priority: 'optional',
  },
  {
    name: 'scheduling_preferences',
    type: 'object',
    description: 'Customer scheduling preferences',
    source: 'database',
    sourceDetail: 'customers.{preferred_days, preferred_time_window, avoid_days, scheduling_notes}',
    priority: 'optional',
  },
  {
    name: 'has_portal_access',
    type: 'boolean',
    description: 'Whether customer has portal access',
    source: 'derived',
    sourceDetail: 'customer_accounts.id IS NOT NULL',
    priority: 'optional',
  },
];

const JOB_CONTEXT: ContextField[] = [
  {
    name: 'job_id',
    type: 'string',
    description: 'Job UUID',
    source: 'database',
    sourceDetail: 'jobs.id',
    priority: 'required',
  },
  {
    name: 'job_title',
    type: 'string | null',
    description: 'Job title/description',
    source: 'database',
    sourceDetail: 'jobs.title',
    priority: 'recommended',
  },
  {
    name: 'job_status',
    type: 'JobStatus',
    description: 'Current job status',
    source: 'database',
    sourceDetail: 'jobs.status',
    priority: 'required',
  },
  {
    name: 'job_address',
    type: 'string | null',
    description: 'Job location address',
    source: 'database',
    sourceDetail: 'jobs.address',
    priority: 'recommended',
  },
  {
    name: 'job_coordinates',
    type: '{ lat: number, lng: number } | null',
    description: 'Job GPS coordinates',
    source: 'database',
    sourceDetail: 'jobs.{latitude, longitude}',
    priority: 'optional',
  },
  {
    name: 'scheduled_time',
    type: '{ starts_at: string, ends_at: string } | null',
    description: 'Scheduled start and end times',
    source: 'database',
    sourceDetail: 'jobs.{starts_at, ends_at}',
    priority: 'recommended',
  },
  {
    name: 'assigned_workers',
    type: 'Array<{ id: string, name: string }>',
    description: 'Workers assigned to job',
    source: 'database',
    sourceDetail: 'job_assignments JOIN profiles',
    priority: 'recommended',
  },
  {
    name: 'job_notes',
    type: 'string | null',
    description: 'Job notes/instructions',
    source: 'database',
    sourceDetail: 'jobs.notes',
    priority: 'optional',
  },
  {
    name: 'estimated_duration',
    type: 'number | null',
    description: 'Estimated duration in minutes',
    source: 'database',
    sourceDetail: 'jobs.estimated_duration_minutes',
    priority: 'optional',
  },
];

// =============================================================================
// DOMAIN 1: CUSTOMER ACQUISITION
// =============================================================================

const CUSTOMER_ACQUISITION_DOMAIN: DomainContext = {
  domainId: 'customer_acquisition',
  domainName: 'Customer Acquisition',
  description: 'Creating and managing customer records',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'create_customer',
      stepName: 'Create Customer',
      description: 'Add a new customer to the business',
      fields: [
        {
          name: 'new_customer_data',
          type: 'CustomerFormData',
          description: 'Customer information to create',
          source: 'derived',
          sourceDetail: 'User input or parsed from request',
          priority: 'required',
        },
        {
          name: 'existing_customers',
          type: 'Array<{ name: string, email: string }>',
          description: 'Existing customers for duplicate detection',
          source: 'database',
          sourceDetail: 'customers WHERE business_id = ?',
          priority: 'recommended',
          cacheDuration: 60,
        },
      ],
      preConditions: ['User has business access'],
      postConditions: ['Customer record created', 'customer_id available'],
    },
    {
      stepId: 'update_customer',
      stepName: 'Update Customer',
      description: 'Modify existing customer information',
      fields: [
        ...CUSTOMER_CONTEXT,
        {
          name: 'update_data',
          type: 'Partial<CustomerFormData>',
          description: 'Fields to update',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'customer_jobs_count',
          type: 'number',
          description: 'Number of jobs for this customer',
          source: 'database',
          sourceDetail: 'COUNT(jobs) WHERE customer_id = ?',
          priority: 'optional',
        },
        {
          name: 'customer_invoices_total',
          type: 'number',
          description: 'Total value of customer invoices',
          source: 'database',
          sourceDetail: 'SUM(invoices.total) WHERE customer_id = ?',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'invite_to_portal',
      stepName: 'Invite to Portal',
      description: 'Send customer portal invitation',
      fields: [
        ...CUSTOMER_CONTEXT,
        {
          name: 'pending_invite',
          type: 'object | null',
          description: 'Existing pending invitation',
          source: 'database',
          sourceDetail: 'customer_portal_invites WHERE customer_id = ? AND accepted_at IS NULL',
          priority: 'recommended',
        },
        {
          name: 'existing_account',
          type: 'object | null',
          description: 'Existing customer account',
          source: 'database',
          sourceDetail: 'customer_accounts WHERE customer_id = ?',
          priority: 'recommended',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 2: SERVICE REQUESTS
// =============================================================================

const SERVICE_REQUEST_DOMAIN: DomainContext = {
  domainId: 'service_request',
  domainName: 'Service Request Intake',
  description: 'Handling incoming service requests',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'create_request',
      stepName: 'Create Request',
      description: 'Log a new service request',
      fields: [
        {
          name: 'request_source',
          type: "'phone' | 'email' | 'portal' | 'walk-in' | 'referral'",
          description: 'How the request came in',
          source: 'derived',
          sourceDetail: 'User selection or auto-detected',
          priority: 'recommended',
        },
        {
          name: 'request_description',
          type: 'string',
          description: 'Description of service needed',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'matching_customers',
          type: 'Array<Customer>',
          description: 'Customers matching provided info',
          source: 'database',
          sourceDetail: 'customers WHERE name ILIKE ? OR email = ? OR phone = ?',
          priority: 'recommended',
        },
        {
          name: 'service_types',
          type: 'Array<string>',
          description: 'Available service types for business',
          source: 'database',
          sourceDetail: 'DISTINCT job_type FROM jobs WHERE business_id = ?',
          priority: 'optional',
          cacheDuration: 3600,
        },
      ],
    },
    {
      stepId: 'triage_request',
      stepName: 'Triage Request',
      description: 'Assess and prioritize request',
      fields: [
        {
          name: 'request_id',
          type: 'string',
          description: 'Request UUID',
          source: 'database',
          sourceDetail: 'requests.id',
          priority: 'required',
        },
        {
          name: 'request_details',
          type: 'Request',
          description: 'Full request information',
          source: 'database',
          sourceDetail: 'requests WHERE id = ?',
          priority: 'required',
        },
        {
          name: 'customer_history',
          type: 'Array<Job>',
          description: 'Previous jobs for this customer',
          source: 'database',
          sourceDetail: 'jobs WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10',
          priority: 'recommended',
        },
        {
          name: 'team_availability_today',
          type: 'Array<{ user_id: string, available_slots: TimeSlot[] }>',
          description: 'Team availability for quick scheduling',
          source: 'edge_function',
          sourceDetail: 'team-availability',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'convert_to_quote',
      stepName: 'Convert to Quote',
      description: 'Create quote from request',
      fields: [
        {
          name: 'request_id',
          type: 'string',
          description: 'Request to convert',
          source: 'database',
          sourceDetail: 'requests.id',
          priority: 'required',
        },
        {
          name: 'request_with_customer',
          type: 'Request & { customer: Customer }',
          description: 'Request with customer details',
          source: 'database',
          sourceDetail: 'requests JOIN customers',
          priority: 'required',
        },
        {
          name: 'similar_quotes',
          type: 'Array<Quote>',
          description: 'Similar past quotes for pricing reference',
          source: 'database',
          sourceDetail: 'quotes WHERE customer_id = ? OR title ILIKE ?',
          priority: 'optional',
        },
        {
          name: 'pricing_rules',
          type: 'PricingRules | null',
          description: 'Business pricing configuration',
          source: 'database',
          sourceDetail: 'pricing_rules WHERE business_id = ?',
          priority: 'optional',
          cacheDuration: 3600,
        },
      ],
    },
    {
      stepId: 'convert_to_job',
      stepName: 'Convert to Job',
      description: 'Create job directly from request',
      fields: [
        {
          name: 'request_id',
          type: 'string',
          description: 'Request to convert',
          source: 'database',
          sourceDetail: 'requests.id',
          priority: 'required',
        },
        {
          name: 'request_with_customer',
          type: 'Request & { customer: Customer }',
          description: 'Request with customer details',
          source: 'database',
          sourceDetail: 'requests JOIN customers',
          priority: 'required',
        },
        {
          name: 'available_time_slots',
          type: 'Array<TimeSlot>',
          description: 'Available scheduling slots',
          source: 'edge_function',
          sourceDetail: 'ai-schedule',
          priority: 'recommended',
        },
        {
          name: 'checklist_templates',
          type: 'Array<ChecklistTemplate>',
          description: 'Available checklist templates',
          source: 'database',
          sourceDetail: 'sg_checklist_templates WHERE business_id = ? OR is_system_template = true',
          priority: 'optional',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 3: QUOTE LIFECYCLE
// =============================================================================

const QUOTE_LIFECYCLE_DOMAIN: DomainContext = {
  domainId: 'quote_lifecycle',
  domainName: 'Quote Management',
  description: 'Creating, sending, and managing quotes',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'create_quote',
      stepName: 'Create Quote',
      description: 'Create a new quote for customer',
      fields: [
        ...CUSTOMER_CONTEXT,
        {
          name: 'next_quote_number',
          type: 'string',
          description: 'Next available quote number',
          source: 'derived',
          sourceDetail: 'businesses.est_prefix + businesses.est_seq',
          priority: 'required',
        },
        {
          name: 'line_items',
          type: 'Array<LineItem>',
          description: 'Quote line items',
          source: 'derived',
          sourceDetail: 'User input or copied from template',
          priority: 'required',
        },
        {
          name: 'saved_line_items',
          type: 'Array<LineItem>',
          description: 'Previously used line items',
          source: 'database',
          sourceDetail: 'quote_line_items WHERE business_id = ? GROUP BY name',
          priority: 'optional',
          cacheDuration: 300,
        },
        {
          name: 'similar_quotes',
          type: 'Array<Quote>',
          description: 'Similar quotes for reference',
          source: 'database',
          sourceDetail: 'quotes WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'edit_quote',
      stepName: 'Edit Quote',
      description: 'Modify existing quote',
      fields: [
        {
          name: 'quote_id',
          type: 'string',
          description: 'Quote UUID',
          source: 'database',
          sourceDetail: 'quotes.id',
          priority: 'required',
        },
        {
          name: 'quote_full',
          type: 'Quote & { line_items: LineItem[], customer: Customer }',
          description: 'Full quote with relations',
          source: 'edge_function',
          sourceDetail: 'quotes-crud GET',
          priority: 'required',
        },
        {
          name: 'quote_editable',
          type: 'boolean',
          description: 'Whether quote can be edited',
          source: 'derived',
          sourceDetail: 'quote.status IN ("Draft", "Sent")',
          priority: 'required',
        },
      ],
    },
    {
      stepId: 'send_quote',
      stepName: 'Send Quote',
      description: 'Send quote to customer',
      fields: [
        {
          name: 'quote_id',
          type: 'string',
          description: 'Quote to send',
          source: 'database',
          sourceDetail: 'quotes.id',
          priority: 'required',
        },
        {
          name: 'quote_with_customer',
          type: 'Quote & { customer: Customer }',
          description: 'Quote with customer details',
          source: 'database',
          sourceDetail: 'quotes JOIN customers',
          priority: 'required',
        },
        {
          name: 'business_reply_email',
          type: 'string | null',
          description: 'Business reply-to email',
          source: 'database',
          sourceDetail: 'businesses.reply_to_email',
          priority: 'recommended',
        },
        {
          name: 'previous_sends',
          type: 'Array<MailSend>',
          description: 'Previous email sends for this quote',
          source: 'database',
          sourceDetail: 'mail_sends WHERE quote_id = ?',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'approve_quote',
      stepName: 'Customer Approves Quote',
      description: 'Handle quote approval',
      fields: [
        {
          name: 'quote_public_token',
          type: 'string',
          description: 'Public access token',
          source: 'derived',
          sourceDetail: 'URL parameter',
          priority: 'required',
        },
        {
          name: 'quote_for_approval',
          type: 'Quote & { line_items: LineItem[], business: Business }',
          description: 'Quote details for customer view',
          source: 'edge_function',
          sourceDetail: 'quote-public GET',
          priority: 'required',
        },
        {
          name: 'requires_deposit',
          type: 'boolean',
          description: 'Whether deposit is required',
          source: 'derived',
          sourceDetail: 'quote.deposit_required',
          priority: 'required',
        },
        {
          name: 'deposit_amount',
          type: 'number | null',
          description: 'Required deposit amount',
          source: 'derived',
          sourceDetail: 'quote.total * (quote.deposit_percent / 100)',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'convert_quote_to_job',
      stepName: 'Convert to Job',
      description: 'Create job from approved quote',
      fields: [
        {
          name: 'quote_id',
          type: 'string',
          description: 'Quote to convert',
          source: 'database',
          sourceDetail: 'quotes.id',
          priority: 'required',
        },
        {
          name: 'quote_full',
          type: 'Quote & { customer: Customer, line_items: LineItem[] }',
          description: 'Full quote details',
          source: 'database',
          sourceDetail: 'quotes JOIN customers JOIN quote_line_items',
          priority: 'required',
        },
        {
          name: 'existing_job',
          type: 'Job | null',
          description: 'Job already created from this quote',
          source: 'database',
          sourceDetail: 'jobs WHERE quote_id = ?',
          priority: 'recommended',
        },
        {
          name: 'suggested_schedule',
          type: 'ScheduleSuggestion',
          description: 'AI-suggested scheduling',
          source: 'edge_function',
          sourceDetail: 'ai-schedule',
          priority: 'optional',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 4: JOB/WORK ORDER MANAGEMENT
// =============================================================================

const JOB_MANAGEMENT_DOMAIN: DomainContext = {
  domainId: 'job_management',
  domainName: 'Job/Work Order Management',
  description: 'Creating, updating, and completing jobs',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'create_job',
      stepName: 'Create Job',
      description: 'Create a new job',
      fields: [
        ...CUSTOMER_CONTEXT,
        {
          name: 'job_title',
          type: 'string',
          description: 'Job title/description',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'recommended',
        },
        {
          name: 'job_address',
          type: 'string',
          description: 'Job location',
          source: 'derived',
          sourceDetail: 'User input or customer.address',
          priority: 'recommended',
        },
        {
          name: 'schedule_time',
          type: '{ starts_at: string, ends_at: string }',
          description: 'When to schedule',
          source: 'derived',
          sourceDetail: 'User input or AI suggestion',
          priority: 'recommended',
        },
        {
          name: 'available_workers',
          type: 'Array<{ id: string, name: string, email: string }>',
          description: 'Team members available for assignment',
          source: 'database',
          sourceDetail: 'profiles JOIN business_permissions WHERE business_id = ?',
          priority: 'recommended',
        },
        {
          name: 'checklist_templates',
          type: 'Array<ChecklistTemplate>',
          description: 'Available checklists to attach',
          source: 'database',
          sourceDetail: 'sg_checklist_templates WHERE business_id = ? OR is_system_template = true',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'update_job',
      stepName: 'Update Job',
      description: 'Modify job details',
      fields: [
        ...JOB_CONTEXT,
        ...CUSTOMER_CONTEXT,
        {
          name: 'update_data',
          type: 'Partial<Job>',
          description: 'Fields to update',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'job_history',
          type: 'Array<AuditLog>',
          description: 'Previous changes to job',
          source: 'database',
          sourceDetail: 'audit_logs WHERE resource_type = "job" AND resource_id = ?',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'assign_job',
      stepName: 'Assign Workers',
      description: 'Assign team members to job',
      fields: [
        ...JOB_CONTEXT,
        {
          name: 'current_assignments',
          type: 'Array<{ user_id: string, name: string }>',
          description: 'Currently assigned workers',
          source: 'database',
          sourceDetail: 'job_assignments JOIN profiles WHERE job_id = ?',
          priority: 'required',
        },
        {
          name: 'available_workers',
          type: 'Array<{ id: string, name: string, current_workload: number }>',
          description: 'Available team members with workload',
          source: 'edge_function',
          sourceDetail: 'team-availability',
          priority: 'required',
        },
        {
          name: 'job_checklists',
          type: 'Array<Checklist>',
          description: 'Checklists attached to job',
          source: 'database',
          sourceDetail: 'sg_checklists WHERE job_id = ?',
          priority: 'optional',
        },
        {
          name: 'cascade_to_checklists',
          type: 'boolean',
          description: 'Whether to assign to checklist items too',
          source: 'derived',
          sourceDetail: 'User preference',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'start_job',
      stepName: 'Start Job (Clock In)',
      description: 'Begin work on job',
      fields: [
        ...JOB_CONTEXT,
        {
          name: 'current_timesheet',
          type: 'TimesheetEntry | null',
          description: 'User current timesheet entry',
          source: 'database',
          sourceDetail: 'timesheet_entries WHERE user_id = ? AND clock_out_time IS NULL',
          priority: 'required',
        },
        {
          name: 'job_checklist',
          type: 'Checklist | null',
          description: 'Primary checklist for job',
          source: 'database',
          sourceDetail: 'sg_checklists WHERE job_id = ? LIMIT 1',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'complete_job',
      stepName: 'Complete Job',
      description: 'Mark job as completed',
      fields: [
        ...JOB_CONTEXT,
        {
          name: 'checklist_progress',
          type: '{ total: number, completed: number }',
          description: 'Checklist completion status',
          source: 'database',
          sourceDetail: 'sg_checklist_items aggregate WHERE checklist.job_id = ?',
          priority: 'recommended',
        },
        {
          name: 'time_logged',
          type: 'number',
          description: 'Total minutes logged on job',
          source: 'database',
          sourceDetail: 'SUM(timesheet_entries) WHERE job_id = ?',
          priority: 'optional',
        },
        {
          name: 'job_photos',
          type: 'Array<Media>',
          description: 'Photos uploaded to job',
          source: 'database',
          sourceDetail: 'sg_media WHERE job_id = ?',
          priority: 'optional',
        },
        {
          name: 'related_quote',
          type: 'Quote | null',
          description: 'Quote this job came from',
          source: 'database',
          sourceDetail: 'quotes WHERE id = job.quote_id',
          priority: 'optional',
        },
        {
          name: 'create_invoice',
          type: 'boolean',
          description: 'Whether to create invoice on completion',
          source: 'derived',
          sourceDetail: 'User preference',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'upload_job_media',
      stepName: 'Upload Photos/Videos',
      description: 'Add media to job',
      fields: [
        ...JOB_CONTEXT,
        {
          name: 'existing_media',
          type: 'Array<Media>',
          description: 'Already uploaded media',
          source: 'database',
          sourceDetail: 'sg_media WHERE job_id = ?',
          priority: 'recommended',
        },
        {
          name: 'media_to_upload',
          type: 'Array<File>',
          description: 'New files to upload',
          source: 'derived',
          sourceDetail: 'User file selection',
          priority: 'required',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 5: SCHEDULING
// =============================================================================

const SCHEDULING_DOMAIN: DomainContext = {
  domainId: 'scheduling',
  domainName: 'Scheduling & Calendar',
  description: 'Managing schedules and appointments',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'view_calendar',
      stepName: 'View Calendar',
      description: 'Display schedule view',
      fields: [
        {
          name: 'date_range',
          type: '{ start: string, end: string }',
          description: 'Calendar date range',
          source: 'derived',
          sourceDetail: 'View selection (day/week/month)',
          priority: 'required',
        },
        {
          name: 'jobs_in_range',
          type: 'Array<Job>',
          description: 'Jobs scheduled in date range',
          source: 'database',
          sourceDetail: 'jobs WHERE business_id = ? AND starts_at BETWEEN ? AND ?',
          priority: 'required',
        },
        {
          name: 'team_time_off',
          type: 'Array<TimeOffRequest>',
          description: 'Approved time off in range',
          source: 'database',
          sourceDetail: 'time_off_requests WHERE status = "approved" AND dates overlap range',
          priority: 'recommended',
        },
        {
          name: 'recurring_templates',
          type: 'Array<RecurringJobTemplate>',
          description: 'Active recurring job templates',
          source: 'database',
          sourceDetail: 'recurring_job_templates WHERE is_active = true',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'schedule_job',
      stepName: 'Schedule Job',
      description: 'Find and set job time',
      fields: [
        ...JOB_CONTEXT.filter(f => f.name !== 'scheduled_time'),
        ...CUSTOMER_CONTEXT.filter(f => ['customer_id', 'customer_name', 'scheduling_preferences'].includes(f.name)),
        {
          name: 'available_slots',
          type: 'Array<{ start: string, end: string, score: number, workers: string[] }>',
          description: 'AI-suggested time slots',
          source: 'edge_function',
          sourceDetail: 'ai-schedule',
          priority: 'recommended',
        },
        {
          name: 'team_availability',
          type: 'Array<TeamAvailability>',
          description: 'Team member availability',
          source: 'database',
          sourceDetail: 'team_availability WHERE business_id = ?',
          priority: 'required',
        },
        {
          name: 'business_constraints',
          type: 'Array<BusinessConstraint>',
          description: 'Scheduling constraints',
          source: 'database',
          sourceDetail: 'business_constraints WHERE business_id = ? AND is_active = true',
          priority: 'recommended',
        },
        {
          name: 'conflicting_jobs',
          type: 'Array<Job>',
          description: 'Jobs that would conflict with proposed time',
          source: 'derived',
          sourceDetail: 'Computed from jobs and proposed time',
          priority: 'required',
        },
      ],
    },
    {
      stepId: 'reschedule_job',
      stepName: 'Reschedule Job',
      description: 'Change job schedule',
      fields: [
        ...JOB_CONTEXT,
        {
          name: 'original_time',
          type: '{ starts_at: string, ends_at: string }',
          description: 'Current scheduled time',
          source: 'database',
          sourceDetail: 'jobs.{starts_at, ends_at}',
          priority: 'required',
        },
        {
          name: 'new_time',
          type: '{ starts_at: string, ends_at: string }',
          description: 'New proposed time',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'notify_customer',
          type: 'boolean',
          description: 'Whether to notify customer',
          source: 'derived',
          sourceDetail: 'User preference',
          priority: 'recommended',
        },
        {
          name: 'reschedule_reason',
          type: 'string | null',
          description: 'Reason for reschedule',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'batch_schedule',
      stepName: 'Batch Schedule',
      description: 'Schedule multiple jobs optimally',
      fields: [
        {
          name: 'unscheduled_jobs',
          type: 'Array<Job>',
          description: 'Jobs without schedule',
          source: 'database',
          sourceDetail: 'jobs WHERE starts_at IS NULL AND status = "Scheduled"',
          priority: 'required',
        },
        {
          name: 'date_range',
          type: '{ start: string, end: string }',
          description: 'Date range to schedule within',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'team_availability_range',
          type: 'Map<string, Array<TimeSlot>>',
          description: 'Team availability for date range',
          source: 'edge_function',
          sourceDetail: 'team-availability',
          priority: 'required',
        },
        {
          name: 'optimization_preferences',
          type: '{ minimize_travel: boolean, respect_preferences: boolean, balance_workload: boolean }',
          description: 'Optimization goals',
          source: 'derived',
          sourceDetail: 'User preferences or business defaults',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'optimize_route',
      stepName: 'Optimize Route',
      description: 'Plan optimal route for day',
      fields: [
        {
          name: 'date',
          type: 'string',
          description: 'Date to optimize',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'required',
        },
        {
          name: 'worker_id',
          type: 'string',
          description: 'Worker to optimize for',
          source: 'derived',
          sourceDetail: 'User selection or current user',
          priority: 'required',
        },
        {
          name: 'jobs_for_day',
          type: 'Array<Job>',
          description: 'Jobs scheduled for that day/worker',
          source: 'database',
          sourceDetail: 'jobs JOIN job_assignments WHERE date(starts_at) = ? AND user_id = ?',
          priority: 'required',
        },
        {
          name: 'starting_location',
          type: '{ lat: number, lng: number, address: string }',
          description: 'Route starting point',
          source: 'derived',
          sourceDetail: 'User input or business address',
          priority: 'required',
        },
        {
          name: 'current_traffic',
          type: 'TrafficData',
          description: 'Live traffic conditions',
          source: 'external',
          sourceDetail: 'Google Maps Traffic API',
          priority: 'optional',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 6: TIME TRACKING
// =============================================================================

const TIME_TRACKING_DOMAIN: DomainContext = {
  domainId: 'time_tracking',
  domainName: 'Time Tracking',
  description: 'Managing timesheets and work hours',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'clock_in',
      stepName: 'Clock In',
      description: 'Start time tracking',
      fields: [
        {
          name: 'current_entry',
          type: 'TimesheetEntry | null',
          description: 'Active timesheet entry if any',
          source: 'database',
          sourceDetail: 'timesheet_entries WHERE user_id = ? AND clock_out_time IS NULL',
          priority: 'required',
        },
        {
          name: 'job_id',
          type: 'string | null',
          description: 'Job to clock into',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'optional',
        },
        {
          name: 'todays_jobs',
          type: 'Array<Job>',
          description: 'Jobs scheduled for today for user',
          source: 'database',
          sourceDetail: 'jobs JOIN job_assignments WHERE date(starts_at) = today AND user_id = ?',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'clock_out',
      stepName: 'Clock Out',
      description: 'End time tracking',
      fields: [
        {
          name: 'current_entry',
          type: 'TimesheetEntry',
          description: 'Active timesheet entry',
          source: 'database',
          sourceDetail: 'timesheet_entries WHERE user_id = ? AND clock_out_time IS NULL',
          priority: 'required',
        },
        {
          name: 'job_details',
          type: 'Job | null',
          description: 'Job being clocked out of',
          source: 'database',
          sourceDetail: 'jobs WHERE id = current_entry.job_id',
          priority: 'optional',
        },
        {
          name: 'tasks_completed',
          type: 'Array<ChecklistItem>',
          description: 'Tasks completed during this entry',
          source: 'database',
          sourceDetail: 'sg_checklist_items WHERE timesheet_entry_id = ?',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'view_timesheet',
      stepName: 'View Timesheet',
      description: 'Display timesheet records',
      fields: [
        {
          name: 'date_range',
          type: '{ start: string, end: string }',
          description: 'Period to view',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'required',
        },
        {
          name: 'user_filter',
          type: 'string | null',
          description: 'Filter by user (null = all)',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'optional',
        },
        {
          name: 'timesheet_entries',
          type: 'Array<TimesheetEntry & { job?: Job }>',
          description: 'Timesheet entries in range',
          source: 'database',
          sourceDetail: 'timesheet_entries LEFT JOIN jobs WHERE business_id = ? AND date BETWEEN ? AND ?',
          priority: 'required',
        },
        {
          name: 'summary_stats',
          type: '{ total_hours: number, by_user: Map<string, number>, by_job: Map<string, number> }',
          description: 'Aggregated statistics',
          source: 'derived',
          sourceDetail: 'Computed from timesheet_entries',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'edit_timesheet',
      stepName: 'Edit Entry',
      description: 'Modify timesheet entry',
      fields: [
        {
          name: 'entry_id',
          type: 'string',
          description: 'Entry to edit',
          source: 'database',
          sourceDetail: 'timesheet_entries.id',
          priority: 'required',
        },
        {
          name: 'entry_details',
          type: 'TimesheetEntry',
          description: 'Current entry data',
          source: 'database',
          sourceDetail: 'timesheet_entries WHERE id = ?',
          priority: 'required',
        },
        {
          name: 'can_edit',
          type: 'boolean',
          description: 'Whether user can edit this entry',
          source: 'derived',
          sourceDetail: 'entry.user_id === current_user OR user_role === "owner"',
          priority: 'required',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 7: INVOICING
// =============================================================================

const INVOICING_DOMAIN: DomainContext = {
  domainId: 'invoicing',
  domainName: 'Invoice Management',
  description: 'Creating and managing invoices',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'create_invoice',
      stepName: 'Create Invoice',
      description: 'Create a new invoice',
      fields: [
        ...CUSTOMER_CONTEXT,
        {
          name: 'next_invoice_number',
          type: 'string',
          description: 'Next available invoice number',
          source: 'derived',
          sourceDetail: 'businesses.inv_prefix + businesses.inv_seq',
          priority: 'required',
        },
        {
          name: 'source_job',
          type: 'Job | null',
          description: 'Job to create invoice from',
          source: 'database',
          sourceDetail: 'jobs WHERE id = ?',
          priority: 'optional',
        },
        {
          name: 'source_quote',
          type: 'Quote & { line_items: LineItem[] } | null',
          description: 'Quote to create invoice from',
          source: 'database',
          sourceDetail: 'quotes JOIN quote_line_items WHERE id = ?',
          priority: 'optional',
        },
        {
          name: 'line_items',
          type: 'Array<LineItem>',
          description: 'Invoice line items',
          source: 'derived',
          sourceDetail: 'Copied from quote/job or user input',
          priority: 'required',
        },
        {
          name: 'payment_terms',
          type: 'PaymentTerms',
          description: 'Payment terms setting',
          source: 'derived',
          sourceDetail: 'Business default or user selection',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'edit_invoice',
      stepName: 'Edit Invoice',
      description: 'Modify invoice details',
      fields: [
        {
          name: 'invoice_id',
          type: 'string',
          description: 'Invoice UUID',
          source: 'database',
          sourceDetail: 'invoices.id',
          priority: 'required',
        },
        {
          name: 'invoice_full',
          type: 'Invoice & { line_items: LineItem[], customer: Customer }',
          description: 'Full invoice with relations',
          source: 'edge_function',
          sourceDetail: 'invoices-crud GET',
          priority: 'required',
        },
        {
          name: 'invoice_editable',
          type: 'boolean',
          description: 'Whether invoice can be edited',
          source: 'derived',
          sourceDetail: 'invoice.status IN ("Draft")',
          priority: 'required',
        },
        {
          name: 'existing_payments',
          type: 'Array<Payment>',
          description: 'Payments already made on invoice',
          source: 'database',
          sourceDetail: 'payments WHERE invoice_id = ?',
          priority: 'required',
        },
      ],
    },
    {
      stepId: 'send_invoice',
      stepName: 'Send Invoice',
      description: 'Send invoice to customer',
      fields: [
        {
          name: 'invoice_id',
          type: 'string',
          description: 'Invoice to send',
          source: 'database',
          sourceDetail: 'invoices.id',
          priority: 'required',
        },
        {
          name: 'invoice_with_customer',
          type: 'Invoice & { customer: Customer }',
          description: 'Invoice with customer details',
          source: 'database',
          sourceDetail: 'invoices JOIN customers',
          priority: 'required',
        },
        {
          name: 'stripe_enabled',
          type: 'boolean',
          description: 'Whether business has Stripe connected',
          source: 'database',
          sourceDetail: 'businesses.stripe_account_id IS NOT NULL AND stripe_charges_enabled',
          priority: 'recommended',
        },
        {
          name: 'previous_sends',
          type: 'Array<MailSend>',
          description: 'Previous email sends',
          source: 'database',
          sourceDetail: 'mail_sends WHERE invoice_id = ?',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'void_invoice',
      stepName: 'Void Invoice',
      description: 'Cancel an invoice',
      fields: [
        {
          name: 'invoice_id',
          type: 'string',
          description: 'Invoice to void',
          source: 'database',
          sourceDetail: 'invoices.id',
          priority: 'required',
        },
        {
          name: 'invoice_details',
          type: 'Invoice',
          description: 'Invoice information',
          source: 'database',
          sourceDetail: 'invoices WHERE id = ?',
          priority: 'required',
        },
        {
          name: 'has_payments',
          type: 'boolean',
          description: 'Whether invoice has payments',
          source: 'database',
          sourceDetail: 'EXISTS(payments WHERE invoice_id = ?)',
          priority: 'required',
        },
        {
          name: 'void_reason',
          type: 'string',
          description: 'Reason for voiding',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'recommended',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 8: PAYMENT PROCESSING
// =============================================================================

const PAYMENT_DOMAIN: DomainContext = {
  domainId: 'payment_processing',
  domainName: 'Payment Processing',
  description: 'Recording and processing payments',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'record_payment',
      stepName: 'Record Payment',
      description: 'Record a payment received',
      fields: [
        {
          name: 'invoice_id',
          type: 'string',
          description: 'Invoice being paid',
          source: 'database',
          sourceDetail: 'invoices.id',
          priority: 'required',
        },
        {
          name: 'invoice_details',
          type: 'Invoice & { customer: Customer, payments: Payment[] }',
          description: 'Invoice with payment history',
          source: 'database',
          sourceDetail: 'invoices JOIN customers JOIN payments',
          priority: 'required',
        },
        {
          name: 'amount_due',
          type: 'number',
          description: 'Remaining balance due',
          source: 'derived',
          sourceDetail: 'invoice.total - SUM(payments.amount)',
          priority: 'required',
        },
        {
          name: 'payment_amount',
          type: 'number',
          description: 'Amount being paid',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'payment_method',
          type: "'cash' | 'check' | 'card' | 'transfer' | 'other'",
          description: 'How payment was made',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'required',
        },
      ],
    },
    {
      stepId: 'process_card_payment',
      stepName: 'Process Card Payment',
      description: 'Process online card payment',
      fields: [
        {
          name: 'invoice_public_token',
          type: 'string',
          description: 'Public invoice access token',
          source: 'derived',
          sourceDetail: 'URL parameter',
          priority: 'required',
        },
        {
          name: 'invoice_for_payment',
          type: 'Invoice & { business: Business }',
          description: 'Invoice with business info',
          source: 'edge_function',
          sourceDetail: 'invoice-public GET',
          priority: 'required',
        },
        {
          name: 'stripe_publishable_key',
          type: 'string',
          description: 'Stripe publishable key',
          source: 'edge_function',
          sourceDetail: 'stripe-connect GET publishable_key',
          priority: 'required',
        },
        {
          name: 'payment_intent',
          type: 'PaymentIntent',
          description: 'Stripe payment intent',
          source: 'edge_function',
          sourceDetail: 'create-invoice-payment-intent',
          priority: 'required',
        },
        {
          name: 'saved_payment_methods',
          type: 'Array<PaymentMethod>',
          description: 'Customer saved cards',
          source: 'edge_function',
          sourceDetail: 'stripe-customer-payment-methods',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'view_payment_history',
      stepName: 'View Payments',
      description: 'View payment records',
      fields: [
        {
          name: 'date_range',
          type: '{ start: string, end: string }',
          description: 'Period to view',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'recommended',
        },
        {
          name: 'payments',
          type: 'Array<Payment & { invoice: Invoice, customer: Customer }>',
          description: 'Payment records with relations',
          source: 'database',
          sourceDetail: 'payments JOIN invoices JOIN customers WHERE business_id = ?',
          priority: 'required',
        },
        {
          name: 'payment_summary',
          type: '{ total: number, by_method: Map<string, number>, count: number }',
          description: 'Aggregated payment stats',
          source: 'derived',
          sourceDetail: 'Computed from payments',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'refund_payment',
      stepName: 'Refund Payment',
      description: 'Process a refund',
      fields: [
        {
          name: 'payment_id',
          type: 'string',
          description: 'Payment to refund',
          source: 'database',
          sourceDetail: 'payments.id',
          priority: 'required',
        },
        {
          name: 'payment_details',
          type: 'Payment & { invoice: Invoice }',
          description: 'Payment information',
          source: 'database',
          sourceDetail: 'payments JOIN invoices WHERE id = ?',
          priority: 'required',
        },
        {
          name: 'refund_amount',
          type: 'number',
          description: 'Amount to refund',
          source: 'derived',
          sourceDetail: 'User input (max = payment.amount)',
          priority: 'required',
        },
        {
          name: 'can_refund_via_stripe',
          type: 'boolean',
          description: 'Whether Stripe refund is possible',
          source: 'derived',
          sourceDetail: 'payment.method === "card" && payment has stripe_charge_id',
          priority: 'required',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 9: RECURRING BILLING
// =============================================================================

const RECURRING_BILLING_DOMAIN: DomainContext = {
  domainId: 'recurring_billing',
  domainName: 'Recurring Billing',
  description: 'Managing subscriptions and recurring invoices',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'create_recurring_schedule',
      stepName: 'Create Recurring Schedule',
      description: 'Set up recurring billing',
      fields: [
        ...CUSTOMER_CONTEXT,
        {
          name: 'source_quote',
          type: 'Quote & { line_items: LineItem[] }',
          description: 'Quote to base schedule on',
          source: 'database',
          sourceDetail: 'quotes JOIN quote_line_items WHERE id = ?',
          priority: 'required',
        },
        {
          name: 'frequency',
          type: "'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'",
          description: 'Billing frequency',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'required',
        },
        {
          name: 'start_date',
          type: 'string',
          description: 'When to start billing',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'stripe_connected',
          type: 'boolean',
          description: 'Whether Stripe is connected',
          source: 'database',
          sourceDetail: 'businesses.stripe_charges_enabled',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'manage_recurring_schedule',
      stepName: 'Manage Schedule',
      description: 'View/edit recurring schedule',
      fields: [
        {
          name: 'schedule_id',
          type: 'string',
          description: 'Schedule UUID',
          source: 'database',
          sourceDetail: 'recurring_schedules.id',
          priority: 'required',
        },
        {
          name: 'schedule_details',
          type: 'RecurringSchedule & { quote: Quote, customer: Customer }',
          description: 'Full schedule information',
          source: 'database',
          sourceDetail: 'recurring_schedules JOIN quotes JOIN customers',
          priority: 'required',
        },
        {
          name: 'generated_invoices',
          type: 'Array<Invoice>',
          description: 'Invoices generated by this schedule',
          source: 'database',
          sourceDetail: 'invoices WHERE recurring_schedule_id = ?',
          priority: 'recommended',
        },
        {
          name: 'next_invoice_date',
          type: 'string',
          description: 'When next invoice will generate',
          source: 'derived',
          sourceDetail: 'Computed from schedule.next_billing_date',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'pause_recurring',
      stepName: 'Pause Schedule',
      description: 'Temporarily pause billing',
      fields: [
        {
          name: 'schedule_id',
          type: 'string',
          description: 'Schedule to pause',
          source: 'database',
          sourceDetail: 'recurring_schedules.id',
          priority: 'required',
        },
        {
          name: 'schedule_status',
          type: 'string',
          description: 'Current schedule status',
          source: 'database',
          sourceDetail: 'recurring_schedules.status',
          priority: 'required',
        },
        {
          name: 'has_stripe_subscription',
          type: 'boolean',
          description: 'Whether linked to Stripe subscription',
          source: 'database',
          sourceDetail: 'recurring_schedules.stripe_subscription_id IS NOT NULL',
          priority: 'required',
        },
      ],
    },
    {
      stepId: 'cancel_recurring',
      stepName: 'Cancel Schedule',
      description: 'Permanently cancel billing',
      fields: [
        {
          name: 'schedule_id',
          type: 'string',
          description: 'Schedule to cancel',
          source: 'database',
          sourceDetail: 'recurring_schedules.id',
          priority: 'required',
        },
        {
          name: 'schedule_details',
          type: 'RecurringSchedule',
          description: 'Schedule information',
          source: 'database',
          sourceDetail: 'recurring_schedules WHERE id = ?',
          priority: 'required',
        },
        {
          name: 'outstanding_invoices',
          type: 'Array<Invoice>',
          description: 'Unpaid invoices from schedule',
          source: 'database',
          sourceDetail: 'invoices WHERE recurring_schedule_id = ? AND status != "Paid"',
          priority: 'recommended',
        },
        {
          name: 'cancellation_reason',
          type: 'string',
          description: 'Why being cancelled',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'optional',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 10: TEAM MANAGEMENT
// =============================================================================

const TEAM_MANAGEMENT_DOMAIN: DomainContext = {
  domainId: 'team_management',
  domainName: 'Team Management',
  description: 'Managing team members and permissions',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'invite_member',
      stepName: 'Invite Team Member',
      description: 'Send invitation to new team member',
      fields: [
        {
          name: 'invitee_email',
          type: 'string',
          description: 'Email to invite',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'existing_members',
          type: 'Array<{ email: string, name: string }>',
          description: 'Current team members',
          source: 'database',
          sourceDetail: 'profiles JOIN business_permissions WHERE business_id = ?',
          priority: 'recommended',
        },
        {
          name: 'pending_invites',
          type: 'Array<Invite>',
          description: 'Outstanding invitations',
          source: 'database',
          sourceDetail: 'invites WHERE business_id = ? AND accepted_at IS NULL AND revoked_at IS NULL',
          priority: 'recommended',
        },
        {
          name: 'role',
          type: "'admin' | 'worker'",
          description: 'Role to assign',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'required',
        },
      ],
    },
    {
      stepId: 'manage_member',
      stepName: 'Manage Member',
      description: 'Update team member settings',
      fields: [
        {
          name: 'member_id',
          type: 'string',
          description: 'Member profile ID',
          source: 'database',
          sourceDetail: 'profiles.id',
          priority: 'required',
        },
        {
          name: 'member_profile',
          type: 'Profile',
          description: 'Member profile data',
          source: 'database',
          sourceDetail: 'profiles WHERE id = ?',
          priority: 'required',
        },
        {
          name: 'member_permission',
          type: 'BusinessPermission',
          description: 'Member business permission',
          source: 'database',
          sourceDetail: 'business_permissions WHERE user_id = ? AND business_id = ?',
          priority: 'required',
        },
        {
          name: 'member_stats',
          type: '{ jobs_count: number, hours_logged: number }',
          description: 'Member activity stats',
          source: 'database',
          sourceDetail: 'Aggregated from jobs, timesheet_entries',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'remove_member',
      stepName: 'Remove Member',
      description: 'Remove team member from business',
      fields: [
        {
          name: 'member_id',
          type: 'string',
          description: 'Member to remove',
          source: 'database',
          sourceDetail: 'profiles.id',
          priority: 'required',
        },
        {
          name: 'assigned_jobs',
          type: 'Array<Job>',
          description: 'Jobs assigned to member',
          source: 'database',
          sourceDetail: 'jobs JOIN job_assignments WHERE user_id = ? AND status NOT IN ("Completed", "Cancelled")',
          priority: 'recommended',
        },
        {
          name: 'assigned_checklists',
          type: 'Array<ChecklistItem>',
          description: 'Incomplete tasks assigned',
          source: 'database',
          sourceDetail: 'sg_checklist_items WHERE assignee_id = ? AND is_completed = false',
          priority: 'recommended',
        },
        {
          name: 'reassign_to',
          type: 'string | null',
          description: 'Who to reassign work to',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'manage_availability',
      stepName: 'Set Availability',
      description: 'Configure team member availability',
      fields: [
        {
          name: 'member_id',
          type: 'string',
          description: 'Member to configure',
          source: 'derived',
          sourceDetail: 'User selection or current user',
          priority: 'required',
        },
        {
          name: 'current_availability',
          type: 'Array<TeamAvailability>',
          description: 'Current availability settings',
          source: 'database',
          sourceDetail: 'team_availability WHERE user_id = ?',
          priority: 'required',
        },
        {
          name: 'time_off_requests',
          type: 'Array<TimeOffRequest>',
          description: 'Pending/approved time off',
          source: 'database',
          sourceDetail: 'time_off_requests WHERE user_id = ?',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'request_time_off',
      stepName: 'Request Time Off',
      description: 'Submit time off request',
      fields: [
        {
          name: 'date_range',
          type: '{ start: string, end: string }',
          description: 'Dates requested off',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'reason',
          type: 'string',
          description: 'Reason for time off',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'optional',
        },
        {
          name: 'conflicting_jobs',
          type: 'Array<Job>',
          description: 'Jobs scheduled during requested time',
          source: 'database',
          sourceDetail: 'jobs JOIN job_assignments WHERE user_id = ? AND starts_at BETWEEN ? AND ?',
          priority: 'recommended',
        },
        {
          name: 'existing_requests',
          type: 'Array<TimeOffRequest>',
          description: 'User existing time off requests',
          source: 'database',
          sourceDetail: 'time_off_requests WHERE user_id = ?',
          priority: 'optional',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 11: CHECKLISTS & TASKS
// =============================================================================

const CHECKLIST_DOMAIN: DomainContext = {
  domainId: 'checklists',
  domainName: 'Checklists & Tasks',
  description: 'Managing checklists and task completion',
  sharedContext: [...BUSINESS_CONTEXT],
  steps: [
    {
      stepId: 'create_template',
      stepName: 'Create Checklist Template',
      description: 'Create reusable checklist template',
      fields: [
        {
          name: 'template_name',
          type: 'string',
          description: 'Template name',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'template_items',
          type: 'Array<{ name: string, position: number }>',
          description: 'Template items/tasks',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'existing_templates',
          type: 'Array<ChecklistTemplate>',
          description: 'Existing templates for reference',
          source: 'database',
          sourceDetail: 'sg_checklist_templates WHERE business_id = ?',
          priority: 'optional',
        },
        {
          name: 'system_templates',
          type: 'Array<ChecklistTemplate>',
          description: 'System templates to duplicate',
          source: 'database',
          sourceDetail: 'sg_checklist_templates WHERE is_system_template = true',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'attach_checklist',
      stepName: 'Attach Checklist to Job',
      description: 'Add checklist to a job',
      fields: [
        ...JOB_CONTEXT.filter(f => ['job_id', 'job_title', 'job_status'].includes(f.name)),
        {
          name: 'available_templates',
          type: 'Array<ChecklistTemplate>',
          description: 'Templates to choose from',
          source: 'database',
          sourceDetail: 'sg_checklist_templates WHERE business_id = ? OR is_system_template = true',
          priority: 'required',
        },
        {
          name: 'existing_checklists',
          type: 'Array<Checklist>',
          description: 'Checklists already on job',
          source: 'database',
          sourceDetail: 'sg_checklists WHERE job_id = ?',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'complete_task',
      stepName: 'Complete Task',
      description: 'Mark checklist item complete',
      fields: [
        {
          name: 'item_id',
          type: 'string',
          description: 'Checklist item ID',
          source: 'database',
          sourceDetail: 'sg_checklist_items.id',
          priority: 'required',
        },
        {
          name: 'item_details',
          type: 'ChecklistItem & { checklist: Checklist }',
          description: 'Item with parent checklist',
          source: 'database',
          sourceDetail: 'sg_checklist_items JOIN sg_checklists',
          priority: 'required',
        },
        {
          name: 'current_timesheet',
          type: 'TimesheetEntry | null',
          description: 'User active timesheet entry',
          source: 'database',
          sourceDetail: 'timesheet_entries WHERE user_id = ? AND clock_out_time IS NULL',
          priority: 'optional',
        },
        {
          name: 'completion_notes',
          type: 'string | null',
          description: 'Notes on completion',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'optional',
        },
        {
          name: 'completion_photo',
          type: 'File | null',
          description: 'Photo evidence',
          source: 'derived',
          sourceDetail: 'User upload',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'view_my_tasks',
      stepName: 'View My Tasks',
      description: 'See assigned tasks across jobs',
      fields: [
        {
          name: 'assigned_tasks',
          type: 'Array<ChecklistItem & { checklist: Checklist, job: Job }>',
          description: 'Tasks assigned to current user',
          source: 'edge_function',
          sourceDetail: 'my-checklist-tasks',
          priority: 'required',
        },
        {
          name: 'current_clock_status',
          type: '{ clocked_in: boolean, job_id: string | null }',
          description: 'User current clock status',
          source: 'database',
          sourceDetail: 'timesheet_entries WHERE user_id = ? AND clock_out_time IS NULL',
          priority: 'recommended',
        },
        {
          name: 'filter',
          type: "'all' | 'today' | 'overdue' | 'upcoming'",
          description: 'Task filter selection',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'assign_task',
      stepName: 'Assign Task',
      description: 'Assign checklist item to team member',
      fields: [
        {
          name: 'item_id',
          type: 'string',
          description: 'Item to assign',
          source: 'database',
          sourceDetail: 'sg_checklist_items.id',
          priority: 'required',
        },
        {
          name: 'item_with_checklist',
          type: 'ChecklistItem & { checklist: Checklist & { job: Job } }',
          description: 'Item with context',
          source: 'database',
          sourceDetail: 'sg_checklist_items JOIN sg_checklists JOIN jobs',
          priority: 'required',
        },
        {
          name: 'available_assignees',
          type: 'Array<{ id: string, name: string }>',
          description: 'Team members who can be assigned',
          source: 'database',
          sourceDetail: 'profiles JOIN business_permissions WHERE business_id = ?',
          priority: 'required',
        },
        {
          name: 'job_assignees',
          type: 'Array<{ id: string, name: string }>',
          description: 'Workers assigned to parent job',
          source: 'database',
          sourceDetail: 'job_assignments JOIN profiles WHERE job_id = ?',
          priority: 'recommended',
        },
      ],
    },
  ],
};

// =============================================================================
// DOMAIN 12: CUSTOMER PORTAL
// =============================================================================

const CUSTOMER_PORTAL_DOMAIN: DomainContext = {
  domainId: 'customer_portal',
  domainName: 'Customer Portal',
  description: 'Customer self-service portal',
  sharedContext: [
    {
      name: 'customer_account_id',
      type: 'string',
      description: 'Logged in customer account ID',
      source: 'session',
      sourceDetail: 'customer_session.customer_account_id',
      priority: 'required',
    },
    {
      name: 'active_customer_id',
      type: 'string',
      description: 'Active customer context',
      source: 'session',
      sourceDetail: 'customer_session.active_customer_id',
      priority: 'required',
    },
    {
      name: 'active_business_id',
      type: 'string',
      description: 'Business being viewed',
      source: 'session',
      sourceDetail: 'customer_session.active_business_id',
      priority: 'required',
    },
  ],
  steps: [
    {
      stepId: 'view_dashboard',
      stepName: 'View Dashboard',
      description: 'Customer portal home',
      fields: [
        {
          name: 'customer_data',
          type: 'CustomerJobData',
          description: 'Complete customer data',
          source: 'edge_function',
          sourceDetail: 'customer-job-data',
          priority: 'required',
        },
        {
          name: 'financial_summary',
          type: 'FinancialSummary',
          description: 'Payment totals and balances',
          source: 'derived',
          sourceDetail: 'Computed from invoices and payments',
          priority: 'required',
        },
        {
          name: 'action_items',
          type: 'ActionItems',
          description: 'Pending quotes, invoices, appointments',
          source: 'derived',
          sourceDetail: 'Computed from customer_data',
          priority: 'required',
        },
      ],
    },
    {
      stepId: 'view_documents',
      stepName: 'View Documents',
      description: 'View quotes and invoices',
      fields: [
        {
          name: 'quotes',
          type: 'Array<CustomerQuote>',
          description: 'Customer quotes',
          source: 'edge_function',
          sourceDetail: 'customer-job-data.quotes',
          priority: 'required',
        },
        {
          name: 'invoices',
          type: 'Array<CustomerInvoice>',
          description: 'Customer invoices',
          source: 'edge_function',
          sourceDetail: 'customer-job-data.invoices',
          priority: 'required',
        },
        {
          name: 'payments',
          type: 'Array<CustomerPayment>',
          description: 'Payment history',
          source: 'edge_function',
          sourceDetail: 'customer-job-data.payments',
          priority: 'recommended',
        },
      ],
    },
    {
      stepId: 'approve_quote_portal',
      stepName: 'Approve Quote',
      description: 'Sign and approve quote',
      fields: [
        {
          name: 'quote_id',
          type: 'string',
          description: 'Quote to approve',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'required',
        },
        {
          name: 'quote_details',
          type: 'Quote & { line_items: LineItem[], business: Business }',
          description: 'Full quote for review',
          source: 'edge_function',
          sourceDetail: 'customer-quote-detail',
          priority: 'required',
        },
        {
          name: 'signature_data',
          type: 'string | null',
          description: 'Signature image data URL',
          source: 'derived',
          sourceDetail: 'Captured from signature pad',
          priority: 'required',
        },
        {
          name: 'deposit_required',
          type: 'boolean',
          description: 'Whether deposit needed',
          source: 'derived',
          sourceDetail: 'quote.deposit_required',
          priority: 'required',
        },
      ],
    },
    {
      stepId: 'pay_invoice_portal',
      stepName: 'Pay Invoice',
      description: 'Make payment on invoice',
      fields: [
        {
          name: 'invoice_id',
          type: 'string',
          description: 'Invoice to pay',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'required',
        },
        {
          name: 'invoice_details',
          type: 'CustomerInvoiceDetail',
          description: 'Invoice for payment',
          source: 'edge_function',
          sourceDetail: 'customer-invoice-detail',
          priority: 'required',
        },
        {
          name: 'saved_payment_methods',
          type: 'Array<PaymentMethod>',
          description: 'Customer saved cards',
          source: 'edge_function',
          sourceDetail: 'customer-payment-methods',
          priority: 'recommended',
        },
        {
          name: 'payment_intent',
          type: 'PaymentIntent',
          description: 'Stripe payment intent',
          source: 'edge_function',
          sourceDetail: 'customer-create-payment-intent',
          priority: 'required',
        },
      ],
    },
    {
      stepId: 'request_reschedule',
      stepName: 'Request Reschedule',
      description: 'Request appointment change',
      fields: [
        {
          name: 'job_id',
          type: 'string',
          description: 'Job to reschedule',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'required',
        },
        {
          name: 'job_details',
          type: 'CustomerJob',
          description: 'Job information',
          source: 'edge_function',
          sourceDetail: 'customer-job-data.jobs',
          priority: 'required',
        },
        {
          name: 'request_type',
          type: "'reschedule' | 'cancel'",
          description: 'Type of request',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'required',
        },
        {
          name: 'preferred_dates',
          type: 'Array<string>',
          description: 'Preferred new dates',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'optional',
        },
        {
          name: 'request_reason',
          type: 'string',
          description: 'Reason for request',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'optional',
        },
      ],
    },
    {
      stepId: 'send_message',
      stepName: 'Send Message',
      description: 'Message business from portal',
      fields: [
        {
          name: 'conversation_id',
          type: 'string | null',
          description: 'Existing conversation if any',
          source: 'database',
          sourceDetail: 'sg_conversations WHERE customer_id = ? AND archived = false',
          priority: 'optional',
        },
        {
          name: 'business_info',
          type: 'CustomerBusiness',
          description: 'Business being contacted',
          source: 'edge_function',
          sourceDetail: 'customer-job-data.business',
          priority: 'required',
        },
        {
          name: 'message_content',
          type: 'string',
          description: 'Message to send',
          source: 'derived',
          sourceDetail: 'User input',
          priority: 'required',
        },
        {
          name: 'attachments',
          type: 'Array<File>',
          description: 'Files to attach',
          source: 'derived',
          sourceDetail: 'User selection',
          priority: 'optional',
        },
      ],
    },
  ],
};

// =============================================================================
// COMPLETE CONTEXT MAP REGISTRY
// =============================================================================

export const CONTEXT_MAP_REGISTRY: DomainContext[] = [
  CUSTOMER_ACQUISITION_DOMAIN,
  SERVICE_REQUEST_DOMAIN,
  QUOTE_LIFECYCLE_DOMAIN,
  JOB_MANAGEMENT_DOMAIN,
  SCHEDULING_DOMAIN,
  TIME_TRACKING_DOMAIN,
  INVOICING_DOMAIN,
  PAYMENT_DOMAIN,
  RECURRING_BILLING_DOMAIN,
  TEAM_MANAGEMENT_DOMAIN,
  CHECKLIST_DOMAIN,
  CUSTOMER_PORTAL_DOMAIN,
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a domain by ID
 */
export function getDomain(domainId: string): DomainContext | undefined {
  return CONTEXT_MAP_REGISTRY.find(d => d.domainId === domainId);
}

/**
 * Get a specific step within a domain
 */
export function getProcessStep(domainId: string, stepId: string): ProcessStepContext | undefined {
  const domain = getDomain(domainId);
  return domain?.steps.find(s => s.stepId === stepId);
}

/**
 * Get all required context fields for a step (including shared context)
 */
export function getRequiredContext(domainId: string, stepId: string): ContextField[] {
  const domain = getDomain(domainId);
  const step = getProcessStep(domainId, stepId);
  
  if (!domain || !step) return [];
  
  const allFields = [...domain.sharedContext, ...step.fields];
  return allFields.filter(f => f.priority === 'required');
}

/**
 * Get all context fields for a step with their sources
 */
export function getAllContextForStep(domainId: string, stepId: string): ContextField[] {
  const domain = getDomain(domainId);
  const step = getProcessStep(domainId, stepId);
  
  if (!domain || !step) return [];
  
  return [...domain.sharedContext, ...step.fields];
}

/**
 * Group context fields by their data source type
 */
export function groupContextBySource(fields: ContextField[]): Record<DataSourceType, ContextField[]> {
  return fields.reduce((acc, field) => {
    if (!acc[field.source]) {
      acc[field.source] = [];
    }
    acc[field.source].push(field);
    return acc;
  }, {} as Record<DataSourceType, ContextField[]>);
}

/**
 * Get all database queries needed for a step
 */
export function getDatabaseQueries(domainId: string, stepId: string): Array<{ field: string, query: string }> {
  const fields = getAllContextForStep(domainId, stepId);
  return fields
    .filter(f => f.source === 'database')
    .map(f => ({ field: f.name, query: f.sourceDetail }));
}

/**
 * Get all edge function calls needed for a step
 */
export function getEdgeFunctionCalls(domainId: string, stepId: string): Array<{ field: string, function: string }> {
  const fields = getAllContextForStep(domainId, stepId);
  return fields
    .filter(f => f.source === 'edge_function')
    .map(f => ({ field: f.name, function: f.sourceDetail }));
}

/**
 * Find all steps that use a specific context field
 */
export function findStepsUsingField(fieldName: string): Array<{ domainId: string, stepId: string }> {
  const results: Array<{ domainId: string, stepId: string }> = [];
  
  for (const domain of CONTEXT_MAP_REGISTRY) {
    // Check shared context
    if (domain.sharedContext.some(f => f.name === fieldName)) {
      domain.steps.forEach(step => {
        results.push({ domainId: domain.domainId, stepId: step.stepId });
      });
    } else {
      // Check step-specific fields
      for (const step of domain.steps) {
        if (step.fields.some(f => f.name === fieldName)) {
          results.push({ domainId: domain.domainId, stepId: step.stepId });
        }
      }
    }
  }
  
  return results;
}

/**
 * Generate a summary of context requirements for all domains
 */
export function generateContextSummary(): Record<string, { steps: number, totalFields: number, requiredFields: number }> {
  const summary: Record<string, { steps: number, totalFields: number, requiredFields: number }> = {};
  
  for (const domain of CONTEXT_MAP_REGISTRY) {
    let totalFields = 0;
    let requiredFields = 0;
    
    for (const step of domain.steps) {
      const allFields = [...domain.sharedContext, ...step.fields];
      totalFields += allFields.length;
      requiredFields += allFields.filter(f => f.priority === 'required').length;
    }
    
    summary[domain.domainId] = {
      steps: domain.steps.length,
      totalFields,
      requiredFields,
    };
  }
  
  return summary;
}

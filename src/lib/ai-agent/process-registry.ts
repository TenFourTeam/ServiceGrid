/**
 * Process Registry - Maps the 15 Universal Processes to their constituent tools
 * Organized by user journey phase: Pre-Service, Service Delivery, Post-Service, Operations
 * 
 * Enhanced with SIPOC (Suppliers, Inputs, Process, Outputs, Customers) framework
 * and automation state tracking (DIY/DWY/DFY)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ProcessPhase = 'pre_service' | 'service_delivery' | 'post_service' | 'operations';

/**
 * Automation maturity states
 * DIY = Do It Yourself (manual, user does everything)
 * DWY = Done With You (AI-assisted, user confirms)
 * DFY = Done For You (fully automated by AI)
 */
export type AutomationState = 'DIY' | 'DWY' | 'DFY';

export interface PhaseDefinition {
  id: ProcessPhase;
  name: string;
  description: string;
  processes: string[];  // Process IDs in execution order
  nextPhases: ProcessPhase[];  // Natural transitions
}

/**
 * SIPOC for parent process level (high-level view)
 */
export interface ProcessSIPOC {
  suppliers: string[];           // Who provides inputs
  inputs: string[];              // What comes into the process
  processSteps: string[];        // High-level step descriptions
  outputs: string[];             // What the process produces
  customers: string[];           // Who receives the outputs
}

/**
 * SIPOC for sub-process level (detailed view)
 */
export interface SubProcessSIPOC {
  supplier: string;              // Primary supplier for this step
  input: string;                 // Primary input
  process: string;               // Detailed process description
  output: string;                // Primary output
  customer: string;              // Who receives this output
}

/**
 * Enhanced sub-step with SIPOC and automation tracking
 */
export interface EnhancedSubStep {
  id: string;
  name: string;
  order: number;                    // Position within parent (1-N)
  currentState: AutomationState;
  targetState: AutomationState;
  sipoc: SubProcessSIPOC;
  tools: string[];                  // ServiceGrid tools for this step
  dbEntities: string[];             // Database tables involved
  automationCapabilities: string[]; // What AI can do at this step
}

/**
 * Legacy sub-step for backward compatibility
 */
export interface SubStep {
  id: string;
  name: string;
  description: string;
  tools: string[];
}

export interface Condition {
  type: 'db_check' | 'context_check' | 'entity_exists' | 'status_equals';
  entity?: string;
  field?: string;
  operator?: '==' | '!=' | '>' | '<' | 'in' | 'not_null';
  value?: any;
  query?: string;
}

/**
 * Enhanced process definition with full SIPOC support
 */
export interface EnhancedProcessDefinition {
  id: string;
  name: string;
  description: string;
  phase: ProcessPhase;
  position: number;                 // 1-15 across all phases
  order: number;                    // Order within phase
  depth: 0;                         // Always 0 for parent process
  currentState: AutomationState;
  targetState: AutomationState;
  sipoc: ProcessSIPOC;              // Parent-level SIPOC
  subSteps: EnhancedSubStep[];      // Child processes with individual SIPOC
  tools: string[];                  // All tools this process uses
  inputContract: Record<string, string>;
  outputContract: Record<string, string>;
  entryConditions: Condition[];
  exitConditions: Condition[];
  userCheckpoints?: string[];
  nextProcesses: string[];
  previousProcesses: string[];
}

/**
 * Legacy process definition for backward compatibility
 */
export interface ProcessDefinition {
  id: string;
  name: string;
  description: string;
  phase: ProcessPhase;
  order: number;
  subSteps: SubStep[];
  tools: string[];
  inputContract: Record<string, string>;
  outputContract: Record<string, string>;
  entryConditions: Condition[];
  exitConditions: Condition[];
  userCheckpoints?: string[];
  nextProcesses: string[];
  previousProcesses: string[];
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
    nextPhases: ['pre_service']
  },
  operations: {
    id: 'operations',
    name: 'Operations',
    description: 'Ongoing business management',
    processes: ['inventory_management', 'reporting_analytics', 'seasonal_planning'],
    nextPhases: []
  }
};

// ============================================================================
// PRE-SERVICE PROCESSES (1-5)
// ============================================================================

export const LEAD_GENERATION: EnhancedProcessDefinition = {
  id: 'lead_generation',
  name: 'Lead Generation',
  description: 'Customer discovers your business and initiates contact through various channels',
  phase: 'pre_service',
  position: 1,
  order: 1,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Website Visitors',
      'Referral Partners',
      'Customer Portal Users',
      'Phone/Email Inquiries'
    ],
    inputs: [
      'Contact Information (name, email, phone)',
      'Service Request Details',
      'Property Address',
      'Referral Source',
      'Preferred Contact Method'
    ],
    processSteps: [
      '1. Receive Inquiry/Referral',
      '2. Qualify Lead',
      '3. Enter Lead into System',
      '4. Assign to Team Member',
      '5. Initial Contact with Lead'
    ],
    outputs: [
      'Qualified Customer Record',
      'Service Request Record',
      'Assignment to Team Member',
      'Initial Contact Logged'
    ],
    customers: [
      'Sales/Estimating Team',
      'Business Owner',
      'AI Agent (for follow-up automation)'
    ]
  },

  subSteps: [
    {
      id: 'receive_inquiry',
      name: 'Receive Inquiry/Referral',
      order: 1,
      currentState: 'DWY',  // UPGRADED: Now has tools for assisted entry
      targetState: 'DFY',
      sipoc: {
        supplier: 'Prospective Customer',
        input: 'Customer inquiry via phone, email, web form, or customer portal',
        process: 'Customer contacts business through available channels. System captures initial contact info (name, email, phone, service need). Check for duplicate customers by email/phone. Log inquiry details into customers table with source tracking.',
        output: 'New customer record OR matched existing customer, plus service request record',
        customer: 'Lead Qualification (next step)'
      },
      tools: ['create_customer', 'search_customers', 'create_request', 'send_email'],
      dbEntities: ['customers', 'requests'],
      automationCapabilities: [
        'Auto-create customer from portal submission',
        'Duplicate detection by email/phone',
        'Auto-acknowledge receipt via email',
        'Send welcome email on creation'
      ]
    },
    {
      id: 'qualify_lead',
      name: 'Qualify Lead',
      order: 2,
      currentState: 'DWY',  // UPGRADED: Now has score_lead and qualify_lead tools
      targetState: 'DFY',
      sipoc: {
        supplier: 'Previous step (Receive Inquiry)',
        input: 'New customer record with contact info and initial service interest',
        process: 'Review customer data for completeness. Verify service area (check address against business coverage). Assess service type match. Check customer history if returning. Update customer record with qualification notes.',
        output: 'Qualified or disqualified customer with status notes',
        customer: 'System Entry (next step) or Archive (if disqualified)'
      },
      tools: ['get_customer', 'search_customers', 'update_customer', 'score_lead', 'qualify_lead'],
      dbEntities: ['customers', 'requests'],
      automationCapabilities: [
        'Auto-qualify based on service area',
        'Flag VIP returning customers',
        'Score lead quality based on data completeness',
        'Mark leads as qualified/disqualified with reason'
      ]
    },
    {
      id: 'enter_into_system',
      name: 'Enter Lead into System',
      order: 3,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Lead Qualification step',
        input: 'Qualified lead information with verification',
        process: 'Ensure all required fields populated in customer record. Create service request with details. Link request to customer. Set request status to pending. Add any photos or documents.',
        output: 'Complete customer + request records ready for assignment',
        customer: 'Assignment step'
      },
      tools: ['create_customer', 'update_customer', 'create_request'],
      dbEntities: ['customers', 'requests'],
      automationCapabilities: [
        'Auto-populate missing fields from context',
        'Create request from chat conversation',
        'Attach photos from customer portal upload'
      ]
    },
    {
      id: 'assign_lead',
      name: 'Assign Lead to Sales/Estimator',
      order: 4,
      currentState: 'DWY',  // UPGRADED: Now has auto_assign_lead tool
      targetState: 'DFY',
      sipoc: {
        supplier: 'System Entry step',
        input: 'Complete customer + request record',
        process: 'Review request type and customer location. Check team member availability and workload. Apply assignment rules (territory, expertise). Create quote or assessment job. Assign to appropriate team member. Notify assigned person.',
        output: 'Quote or job assigned to team member with notification sent',
        customer: 'Assigned Team Member'
      },
      tools: ['create_quote', 'create_job', 'assign_job_to_member', 'list_team_members', 'check_team_availability', 'auto_assign_lead'],
      dbEntities: ['quotes', 'jobs', 'job_assignments', 'business_members'],
      automationCapabilities: [
        'Auto-assign based on workload balancing',
        'Territory-based routing',
        'Skill matching for specialized requests',
        'Automatic workload-based assignment'
      ]
    },
    {
      id: 'initial_contact',
      name: 'Initial Contact with Lead',
      order: 5,
      currentState: 'DWY',  // UPGRADED: Now has send_email tool
      targetState: 'DFY',
      sipoc: {
        supplier: 'Assigned Team Member / AI Agent',
        input: 'Assignment notification with customer details',
        process: 'Review customer information and request details. Select communication channel (email, phone, SMS). Craft personalized outreach highlighting relevant services. Execute initial contact. Log communication in activity log. Set follow-up reminder if no response.',
        output: 'Contact attempt logged, next action scheduled',
        customer: 'Customer (receiving contact) + Sales Team (tracking)'
      },
      tools: ['send_quote', 'send_email', 'invite_to_portal', 'update_job'],
      dbEntities: ['ai_activity_log', 'customers', 'mail_sends'],
      automationCapabilities: [
        'Auto-send welcome email',
        'Send quote immediately after creation',
        'Schedule follow-up reminders',
        'Send custom emails with personalization'
      ]
    }
  ],

  tools: [
    'create_customer',
    'update_customer',
    'get_customer',
    'search_customers',
    'create_request',
    'create_quote',
    'create_job',
    'assign_job_to_member',
    'list_team_members',
    'check_team_availability',
    'send_quote',
    'send_email',
    'score_lead',
    'qualify_lead',
    'auto_assign_lead',
    'invite_to_portal'
  ],
  
  inputContract: {
    name: 'string',
    email: 'string',
    phone: 'string?',
    address: 'string?',
    service_interest: 'string?',
    source: 'string?'
  },
  
  outputContract: {
    customer_id: 'uuid',
    request_id: 'uuid?',
    quote_id: 'uuid?',
    job_id: 'uuid?',
    assigned_to: 'uuid?',
    lead_qualified: 'boolean',
    initial_contact_made: 'boolean'
  },
  
  entryConditions: [],
  
  exitConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' },
    { type: 'context_check', field: 'lead_qualified', operator: '==', value: true }
  ],
  
  userCheckpoints: ['lead_qualification', 'assignment_approval'],
  
  nextProcesses: ['customer_communication', 'site_assessment', 'quoting_estimating'],
  previousProcesses: []
};

export const CUSTOMER_COMMUNICATION: EnhancedProcessDefinition = {
  id: 'customer_communication',
  name: 'Customer Communication',
  description: 'Manage all customer touchpoints throughout the service lifecycle',
  phase: 'pre_service',
  position: 2,
  order: 2,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Customer Service Team',
      'Field Technicians',
      'AI Agent',
      'Scheduling System'
    ],
    inputs: [
      'Customer Contact Request',
      'Service Status Updates',
      'Appointment Details',
      'Quote/Invoice Information',
      'Customer Feedback'
    ],
    processSteps: [
      '1. Receive customer inquiry',
      '2. Access customer and service data',
      '3. Communicate service details/confirm appointment',
      '4. Provide real-time updates during service',
      '5. Follow-up post-service'
    ],
    outputs: [
      'Customer Response Sent',
      'Appointment Confirmation',
      'Service Updates Delivered',
      'Follow-up Completed'
    ],
    customers: [
      'Customer',
      'Internal Teams',
      'CRM System'
    ]
  },

  subSteps: [
    {
      id: 'receive_inquiry',
      name: 'Receive customer inquiry',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Customer',
        input: 'Incoming inquiry via phone, email, chat, or portal',
        process: 'Receive customer communication through any channel. Identify customer in system. Log inquiry details. Route to appropriate handler based on topic.',
        output: 'Logged inquiry ready for response',
        customer: 'Response Handler'
      },
      tools: ['create_request', 'get_customer', 'search_customers'],
      dbEntities: ['customers', 'requests', 'call_logs'],
      automationCapabilities: [
        'Auto-route based on inquiry type',
        'AI-generated initial response',
        'Customer identification from phone/email'
      ]
    },
    {
      id: 'access_data',
      name: 'Access customer and service data',
      order: 2,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Internal Systems',
        input: 'Customer ID or inquiry context',
        process: 'Retrieve customer profile, service history, upcoming jobs, open quotes, and outstanding invoices. Compile relevant context for response.',
        output: 'Complete customer context for response',
        customer: 'Communication Handler'
      },
      tools: ['get_customer', 'get_job', 'get_quote', 'get_invoice', 'list_jobs'],
      dbEntities: ['customers', 'jobs', 'quotes', 'invoices'],
      automationCapabilities: [
        'Auto-compile customer summary',
        'Highlight urgent items',
        'Show communication history'
      ]
    },
    {
      id: 'communicate_details',
      name: 'Communicate service details/confirm appointment',
      order: 3,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Communication Handler',
        input: 'Customer context and appointment details',
        process: 'Craft appropriate response. Include relevant service details, pricing, or scheduling info. Send confirmation email/SMS. Update communication log.',
        output: 'Confirmation sent to customer',
        customer: 'Customer'
      },
      tools: ['send_job_confirmation', 'send_quote', 'send_invoice', 'send_email'],
      dbEntities: ['mail_sends', 'jobs'],
      automationCapabilities: [
        'Auto-send appointment reminders',
        'Personalized quote delivery',
        'Multi-channel notifications'
      ]
    },
    {
      id: 'realtime_updates',
      name: 'Provide real-time updates during service',
      order: 4,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Field Technician / System',
        input: 'Job status changes, ETA updates',
        process: 'Monitor job status. Send on-the-way notification when tech departs. Send arrival confirmation. Update customer on progress or delays.',
        output: 'Status updates delivered to customer',
        customer: 'Customer'
      },
      tools: ['update_job', 'send_email'],
      dbEntities: ['jobs', 'mail_sends'],
      automationCapabilities: [
        'Auto on-the-way notifications',
        'Delay alerts with new ETA',
        'Progress photo sharing'
      ]
    },
    {
      id: 'followup',
      name: 'Follow-up post-service',
      order: 5,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'System / Customer Service',
        input: 'Completed job record',
        process: 'Send service completion notification. Request feedback or review. Send invoice if not already sent. Log follow-up activity.',
        output: 'Follow-up communication completed',
        customer: 'Customer'
      },
      tools: ['send_invoice', 'send_email', 'update_job'],
      dbEntities: ['jobs', 'invoices', 'mail_sends'],
      automationCapabilities: [
        'Auto-send completion summary',
        'Review request automation',
        'Invoice delivery on completion'
      ]
    }
  ],

  tools: [
    'send_quote',
    'send_invoice',
    'send_job_confirmation',
    'send_email',
    'get_customer',
    'update_customer',
    'get_job',
    'get_quote',
    'get_invoice',
    'list_jobs',
    'create_request'
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

export const SITE_ASSESSMENT: EnhancedProcessDefinition = {
  id: 'site_assessment',
  name: 'Site Assessment',
  description: 'Evaluate job requirements through on-site or remote assessment',
  phase: 'pre_service',
  position: 3,
  order: 3,
  depth: 0,
  currentState: 'DIY',
  targetState: 'DWY',
  
  sipoc: {
    suppliers: [
      'Sales Team',
      'Customer',
      'Scheduling System'
    ],
    inputs: [
      'Customer Request Details',
      'Property Address',
      'Access Instructions',
      'Previous Service History'
    ],
    processSteps: [
      '1. Schedule Assessment Visit',
      '2. Conduct Site Assessment',
      '3. Document Findings',
      '4. Identify Materials and Labor'
    ],
    outputs: [
      'Assessment Report',
      'Photos and Measurements',
      'Material Requirements',
      'Labor Estimate'
    ],
    customers: [
      'Estimating Team',
      'Customer',
      'Quoting Process'
    ]
  },

  subSteps: [
    {
      id: 'schedule_assessment',
      name: 'Schedule Assessment Visit',
      order: 1,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Sales Team / Customer',
        input: 'Assessment request with customer preferences',
        process: 'Check estimator availability. Coordinate with customer on timing. Create assessment job with is_assessment flag. Send confirmation to customer.',
        output: 'Scheduled assessment job',
        customer: 'Assigned Estimator'
      },
      tools: ['create_job', 'schedule_job', 'send_job_confirmation'],
      dbEntities: ['jobs', 'job_assignments'],
      automationCapabilities: [
        'Auto-suggest available time slots',
        'Self-service scheduling via portal',
        'Automatic confirmation emails'
      ]
    },
    {
      id: 'conduct_assessment',
      name: 'Conduct Site Assessment',
      order: 2,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Assigned Estimator',
        input: 'Assessment job details and address',
        process: 'Travel to site. Meet with customer. Evaluate conditions, take measurements, note existing issues. Discuss scope with customer.',
        output: 'Raw assessment data',
        customer: 'Documentation step'
      },
      tools: ['update_job', 'get_job'],
      dbEntities: ['jobs'],
      automationCapabilities: [
        'GPS navigation to site',
        'Digital measurement tools',
        'AI-assisted condition analysis from photos'
      ]
    },
    {
      id: 'document_findings',
      name: 'Document Findings',
      order: 3,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Estimator on-site',
        input: 'Observations and measurements',
        process: 'Take photos of key areas. Record measurements. Note material requirements. Document any special conditions or access issues.',
        output: 'Complete assessment documentation',
        customer: 'Quoting process'
      },
      tools: ['update_job'],
      dbEntities: ['jobs'],
      automationCapabilities: [
        'Auto-organize photos by location',
        'Voice-to-text notes',
        'AI extraction of dimensions from photos'
      ]
    },
    {
      id: 'identify_requirements',
      name: 'Identify Materials and Labor',
      order: 4,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Estimator',
        input: 'Assessment documentation',
        process: 'Calculate material quantities. Estimate labor hours. Check inventory availability. Identify any specialty requirements.',
        output: 'Material and labor requirements for quoting',
        customer: 'Quoting/Estimating process'
      },
      tools: ['list_inventory', 'get_inventory', 'list_team_members'],
      dbEntities: ['inventory_items', 'business_members'],
      automationCapabilities: [
        'Auto-calculate quantities from measurements',
        'Inventory availability check',
        'Suggest similar past jobs for reference'
      ]
    }
  ],

  tools: [
    'create_job',
    'update_job',
    'get_job',
    'schedule_job',
    'send_job_confirmation',
    'get_inventory',
    'list_inventory',
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
    estimated_scope: 'string?',
    photos: 'string[]?'
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

export const QUOTING_ESTIMATING: EnhancedProcessDefinition = {
  id: 'quoting_estimating',
  name: 'Quoting/Estimating',
  description: 'Create and manage quotes for customers, from initial request through approval',
  phase: 'pre_service',
  position: 4,
  order: 4,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Site Assessment Team',
      'Customer',
      'Pricing System'
    ],
    inputs: [
      'Assessment Findings',
      'Material Requirements',
      'Labor Estimates',
      'Customer Budget/Preferences',
      'Pricing Rules'
    ],
    processSteps: [
      '1. Receive Service Request',
      '2. Design Solution & Select Materials',
      '3. Calculate Costs & Markup',
      '4. Generate & Present Quote',
      '5. Negotiate & Revise'
    ],
    outputs: [
      'Detailed Quote',
      'Line Items',
      'Terms and Conditions',
      'Approved Quote'
    ],
    customers: [
      'Customer',
      'Scheduling Process',
      'Finance Team'
    ]
  },

  subSteps: [
    {
      id: 'receive_request',
      name: 'Receive Service Request',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Site Assessment / Customer',
        input: 'Service requirements from assessment or direct request',
        process: 'Receive assessment data or customer request. Verify customer exists. Create quote record linked to customer. Associate with request if applicable.',
        output: 'Quote record ready for line items',
        customer: 'Solution Design step'
      },
      tools: ['create_quote', 'get_customer', 'get_job'],
      dbEntities: ['quotes', 'customers', 'jobs'],
      automationCapabilities: [
        'Auto-create quote from assessment',
        'Pull customer address and preferences',
        'Link to originating request'
      ]
    },
    {
      id: 'design_solution',
      name: 'Design Solution & Select Materials',
      order: 2,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Estimator',
        input: 'Assessment findings and requirements',
        process: 'Review assessment details. Determine optimal approach. Select materials from inventory catalog. Plan labor allocation. Consider alternatives for customer options.',
        output: 'Solution design with material selections',
        customer: 'Cost Calculation step'
      },
      tools: ['list_inventory', 'get_inventory', 'create_quote_line_item'],
      dbEntities: ['quote_line_items', 'inventory_items'],
      automationCapabilities: [
        'AI-suggest materials based on job type',
        'Recommend from similar past quotes',
        'Calculate quantities from measurements'
      ]
    },
    {
      id: 'calculate_costs',
      name: 'Calculate Costs & Markup',
      order: 3,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Solution Design step',
        input: 'Material selections and labor requirements',
        process: 'Apply pricing rules for materials markup. Calculate labor costs. Add overhead and profit margin. Apply any discounts. Calculate tax.',
        output: 'Complete pricing with all line items',
        customer: 'Quote Generation step'
      },
      tools: ['update_quote', 'create_quote_line_item', 'update_quote_line_item'],
      dbEntities: ['quotes', 'quote_line_items', 'pricing_rules'],
      automationCapabilities: [
        'Auto-apply pricing rules',
        'Suggest competitive pricing',
        'Calculate profit margins'
      ]
    },
    {
      id: 'generate_quote',
      name: 'Generate & Present Quote',
      order: 4,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Cost Calculation step',
        input: 'Complete quote with pricing',
        process: 'Format quote document. Add terms and conditions. Review for accuracy. Send to customer via email with portal link.',
        output: 'Quote delivered to customer',
        customer: 'Customer'
      },
      tools: ['update_quote', 'send_quote'],
      dbEntities: ['quotes', 'mail_sends'],
      automationCapabilities: [
        'Auto-format professional quote',
        'Personalized cover message',
        'Multi-format delivery (email + portal)'
      ]
    },
    {
      id: 'negotiate_revise',
      name: 'Negotiate & Revise',
      order: 5,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Customer',
        input: 'Customer feedback or objections',
        process: 'Receive customer response. Address questions. Revise quote if needed. Resend updated version. Process approval when received.',
        output: 'Approved quote ready for scheduling',
        customer: 'Scheduling Process'
      },
      tools: ['update_quote', 'update_quote_line_item', 'approve_quote', 'send_quote'],
      dbEntities: ['quotes', 'quote_line_items'],
      automationCapabilities: [
        'Track quote views and engagement',
        'Auto follow-up on pending quotes',
        'One-click approval via portal'
      ]
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
    'delete_quote_line_item',
    'list_inventory',
    'get_inventory'
  ],
  
  inputContract: {
    customer_id: 'uuid',
    service_description: 'string',
    address: 'string?',
    assessment_job_id: 'uuid?'
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

export const SCHEDULING: EnhancedProcessDefinition = {
  id: 'scheduling',
  name: 'Scheduling',
  description: 'Schedule jobs based on availability, skills, and customer preferences',
  phase: 'pre_service',
  position: 5,
  order: 5,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Quoting Process',
      'Customer',
      'Team Calendar System'
    ],
    inputs: [
      'Approved Quote',
      'Customer Preferences',
      'Team Availability',
      'Job Requirements',
      'Geographic Data'
    ],
    processSteps: [
      '1. Receive service request',
      '2. Check technician availability',
      '3. Match technician skills to job',
      '4. Schedule appointment',
      '5. Send confirmation to customer',
      '6. Sync with team calendar'
    ],
    outputs: [
      'Scheduled Job',
      'Team Assignment',
      'Customer Confirmation',
      'Calendar Entry'
    ],
    customers: [
      'Dispatching Process',
      'Field Team',
      'Customer'
    ]
  },

  subSteps: [
    {
      id: 'receive_request',
      name: 'Receive service request',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Quoting Process / Customer',
        input: 'Approved quote or direct booking request',
        process: 'Receive approved quote notification. Convert quote to job or create new job. Capture customer scheduling preferences. Note any special requirements.',
        output: 'Job record ready for scheduling',
        customer: 'Availability Check step'
      },
      tools: ['convert_quote_to_job', 'create_job', 'get_quote'],
      dbEntities: ['jobs', 'quotes'],
      automationCapabilities: [
        'Auto-create job on quote approval',
        'Pull preferences from customer profile',
        'Set job type from quote details'
      ]
    },
    {
      id: 'check_availability',
      name: 'Check technician availability',
      order: 2,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Calendar System',
        input: 'Requested date range and job duration',
        process: 'Query team member calendars. Consider existing job durations. Account for travel time between jobs. Identify available slots.',
        output: 'List of available time slots',
        customer: 'Skills Matching step'
      },
      tools: ['list_team_members', 'get_team_availability', 'list_jobs'],
      dbEntities: ['business_members', 'jobs', 'job_assignments'],
      automationCapabilities: [
        'Real-time availability calculation',
        'Travel time estimation',
        'Workload balancing suggestions'
      ]
    },
    {
      id: 'match_skills',
      name: 'Match technician skills to job',
      order: 3,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Skills Database',
        input: 'Job requirements and available technicians',
        process: 'Review job type requirements. Match against technician certifications and experience. Consider customer preferences or history. Rank candidates.',
        output: 'Recommended technician(s) for job',
        customer: 'Scheduling step'
      },
      tools: ['list_team_members', 'get_team_member'],
      dbEntities: ['business_members'],
      automationCapabilities: [
        'AI skill matching',
        'Historical success rate analysis',
        'Customer-technician match preference'
      ]
    },
    {
      id: 'schedule_appointment',
      name: 'Schedule appointment',
      order: 4,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Scheduler / AI Agent',
        input: 'Selected time slot and technician',
        process: 'Set job start and end times. Assign primary technician. Update job status to Scheduled. Calculate optimized route order if multiple jobs.',
        output: 'Scheduled and assigned job',
        customer: 'Confirmation step'
      },
      tools: ['update_job', 'schedule_job', 'assign_job'],
      dbEntities: ['jobs', 'job_assignments'],
      automationCapabilities: [
        'AI-optimized scheduling',
        'Route optimization',
        'Automatic conflict resolution'
      ]
    },
    {
      id: 'send_confirmation',
      name: 'Send confirmation to customer',
      order: 5,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Scheduling step',
        input: 'Scheduled job details',
        process: 'Generate confirmation email with date, time, technician info. Include any preparation instructions. Provide reschedule options. Send to customer.',
        output: 'Confirmation delivered to customer',
        customer: 'Customer'
      },
      tools: ['send_job_confirmation'],
      dbEntities: ['mail_sends', 'jobs'],
      automationCapabilities: [
        'Auto-send on scheduling',
        'Include add-to-calendar links',
        'Portal link for changes'
      ]
    },
    {
      id: 'sync_calendar',
      name: 'Sync with team calendar',
      order: 6,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Scheduling System',
        input: 'Finalized job assignment',
        process: 'Update technician calendar with job. Include job details and customer address. Set reminders. Sync with external calendars if connected.',
        output: 'Calendar updated for assigned team',
        customer: 'Assigned Technician'
      },
      tools: ['assign_job'],
      dbEntities: ['job_assignments'],
      automationCapabilities: [
        'Google Calendar sync',
        'Mobile push notifications',
        'Day-before reminders'
      ]
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
    'get_team_member',
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

export const DISPATCHING: EnhancedProcessDefinition = {
  id: 'dispatching',
  name: 'Dispatching',
  description: 'Assign and dispatch technicians to scheduled jobs',
  phase: 'service_delivery',
  position: 6,
  order: 1,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Scheduling Process',
      'Team Members',
      'Inventory System'
    ],
    inputs: [
      'Scheduled Job',
      'Team Assignments',
      'Required Materials',
      'Customer Confirmation Status'
    ],
    processSteps: [
      '1. Receive Service Request',
      '2. Verify Customer and Service Details',
      '3. Identify Required Skills and Parts',
      '4. Assign Technician and Schedule',
      '5. Confirm Appointment with Customer',
      '6. Dispatch Technician'
    ],
    outputs: [
      'Dispatched Job',
      'On-the-way Notification',
      'Loaded Vehicle',
      'Updated Job Status'
    ],
    customers: [
      'Field Technician',
      'Customer',
      'Quality Assurance'
    ]
  },

  subSteps: [
    {
      id: 'receive_request',
      name: 'Receive Service Request',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Scheduling System',
        input: 'Scheduled job for today or dispatch window',
        process: 'Review jobs scheduled for dispatch. Verify all details are complete. Prioritize by time and urgency.',
        output: 'Jobs ready for dispatch',
        customer: 'Verification step'
      },
      tools: ['get_job', 'list_jobs'],
      dbEntities: ['jobs'],
      automationCapabilities: [
        'Auto-surface today\'s jobs',
        'Priority flagging',
        'Missing info alerts'
      ]
    },
    {
      id: 'verify_details',
      name: 'Verify Customer and Service Details',
      order: 2,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Previous step',
        input: 'Job record with customer info',
        process: 'Confirm customer contact info is current. Verify address and access instructions. Check for any special notes. Confirm scope hasn\'t changed.',
        output: 'Verified job ready for assignment',
        customer: 'Parts Identification step'
      },
      tools: ['get_job', 'get_customer', 'get_quote'],
      dbEntities: ['jobs', 'customers', 'quotes'],
      automationCapabilities: [
        'Auto-verify customer phone',
        'Address validation',
        'Flag changes since scheduling'
      ]
    },
    {
      id: 'identify_requirements',
      name: 'Identify Required Skills and Parts',
      order: 3,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Job Details',
        input: 'Job scope and quote line items',
        process: 'Review materials needed from quote. Check inventory levels. Identify technician skill requirements. Note any specialty equipment needed.',
        output: 'Requirements checklist',
        customer: 'Assignment step'
      },
      tools: ['list_team_members', 'get_inventory', 'list_inventory'],
      dbEntities: ['inventory_items', 'business_members', 'quote_line_items'],
      automationCapabilities: [
        'Auto-generate parts list',
        'Inventory reservation',
        'Skill requirement matching'
      ]
    },
    {
      id: 'assign_technician',
      name: 'Assign Technician and Schedule',
      order: 4,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Requirements step',
        input: 'Requirements and available technicians',
        process: 'Match technician to requirements. Verify availability. Assign to job. Update technician\'s schedule.',
        output: 'Job assigned to technician',
        customer: 'Confirmation step'
      },
      tools: ['assign_job', 'update_job'],
      dbEntities: ['jobs', 'job_assignments'],
      automationCapabilities: [
        'AI-optimized assignment',
        'Workload balancing',
        'Skill-based routing'
      ]
    },
    {
      id: 'confirm_appointment',
      name: 'Confirm Appointment with Customer',
      order: 5,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Assignment step',
        input: 'Assigned job with technician',
        process: 'Send day-of reminder to customer. Confirm they\'re ready. Get any last-minute updates. Note any changes.',
        output: 'Customer confirmed ready',
        customer: 'Dispatch step'
      },
      tools: ['send_job_confirmation'],
      dbEntities: ['mail_sends', 'jobs'],
      automationCapabilities: [
        'Auto-send morning reminders',
        'Confirmation tracking',
        'Reschedule options'
      ]
    },
    {
      id: 'dispatch',
      name: 'Dispatch Technician',
      order: 6,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Confirmation step',
        input: 'Confirmed and ready job',
        process: 'Release job to technician. Update status to In Progress. Technician departs. Send on-the-way notification to customer.',
        output: 'Technician dispatched, customer notified',
        customer: 'Customer / Quality Assurance'
      },
      tools: ['update_job'],
      dbEntities: ['jobs'],
      automationCapabilities: [
        'One-tap dispatch',
        'Auto on-the-way notification',
        'ETA calculation'
      ]
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
    'get_inventory',
    'list_inventory',
    'get_customer',
    'get_quote'
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

export const QUALITY_ASSURANCE: EnhancedProcessDefinition = {
  id: 'quality_assurance',
  name: 'Quality Assurance',
  description: 'Verify work quality and completion standards',
  phase: 'service_delivery',
  position: 7,
  order: 2,
  depth: 0,
  currentState: 'DIY',
  targetState: 'DWY',
  
  sipoc: {
    suppliers: [
      'Field Technician',
      'Customer',
      'Quality Standards'
    ],
    inputs: [
      'Completed Work',
      'Job Specifications',
      'Quality Checklist',
      'Customer Expectations'
    ],
    processSteps: [
      '1. Review Completed Work',
      '2. Document Completion',
      '3. Get Customer Sign-off',
      '4. Log Any Issues'
    ],
    outputs: [
      'Quality Approval',
      'Completion Photos',
      'Customer Signature',
      'Issue Log'
    ],
    customers: [
      'Invoicing Process',
      'Customer',
      'Management'
    ]
  },

  subSteps: [
    {
      id: 'review_work',
      name: 'Review Completed Work',
      order: 1,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Field Technician',
        input: 'Completed job ready for inspection',
        process: 'Technician self-inspects work. Compare against specifications. Verify all items on quote are complete. Check for any remaining issues.',
        output: 'Self-inspection complete',
        customer: 'Documentation step'
      },
      tools: ['get_job', 'update_job'],
      dbEntities: ['jobs'],
      automationCapabilities: [
        'Digital checklist from quote items',
        'AI photo quality analysis',
        'Completion verification prompts'
      ]
    },
    {
      id: 'document_completion',
      name: 'Document Completion',
      order: 2,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Field Technician',
        input: 'Completed and inspected work',
        process: 'Take after photos. Record completion notes. Log any materials used. Note time spent.',
        output: 'Complete documentation',
        customer: 'Sign-off step'
      },
      tools: ['update_job'],
      dbEntities: ['jobs'],
      automationCapabilities: [
        'Guided photo capture',
        'Voice-to-text notes',
        'Auto time tracking from clock in/out'
      ]
    },
    {
      id: 'customer_signoff',
      name: 'Get Customer Sign-off',
      order: 3,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Documentation step',
        input: 'Documented completion',
        process: 'Walk customer through completed work. Address any questions. Capture digital signature or verbal approval. Thank customer.',
        output: 'Customer approval recorded',
        customer: 'Invoicing Process'
      },
      tools: ['update_job', 'send_job_confirmation'],
      dbEntities: ['jobs'],
      automationCapabilities: [
        'Digital signature capture',
        'Satisfaction rating prompt',
        'Auto-send completion email'
      ]
    },
    {
      id: 'log_issues',
      name: 'Log Any Issues',
      order: 4,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Sign-off step',
        input: 'Any problems or follow-up needs',
        process: 'Record any issues discovered. Note items needing return visit. Create follow-up request if needed. Mark job status appropriately.',
        output: 'Issues documented for follow-up',
        customer: 'Warranty Management / Management'
      },
      tools: ['update_job', 'create_request'],
      dbEntities: ['jobs', 'requests'],
      automationCapabilities: [
        'Issue categorization',
        'Auto-create follow-up request',
        'Flag for management review'
      ]
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

export const PREVENTIVE_MAINTENANCE: EnhancedProcessDefinition = {
  id: 'preventive_maintenance',
  name: 'Preventive Maintenance',
  description: 'Manage recurring service schedules and maintenance programs',
  phase: 'service_delivery',
  position: 8,
  order: 3,
  depth: 0,
  currentState: 'DIY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Customer Contracts',
      'Equipment Records',
      'Scheduling System'
    ],
    inputs: [
      'Service Agreement',
      'Equipment Details',
      'Maintenance Schedule',
      'Service History'
    ],
    processSteps: [
      '1. Identify Maintenance Schedule',
      '2. Generate Recurring Jobs',
      '3. Notify Customer',
      '4. Track Service History'
    ],
    outputs: [
      'Scheduled Maintenance Jobs',
      'Customer Notifications',
      'Service Records',
      'Equipment History'
    ],
    customers: [
      'Dispatching Process',
      'Customer',
      'Equipment Records'
    ]
  },

  subSteps: [
    {
      id: 'identify_schedule',
      name: 'Identify Maintenance Schedule',
      order: 1,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Customer Records',
        input: 'Customer agreements and preferences',
        process: 'Review customer maintenance agreements. Check last service dates. Calculate next service due date. Identify customers due for service.',
        output: 'List of due maintenance visits',
        customer: 'Job Generation step'
      },
      tools: ['get_customer', 'list_jobs'],
      dbEntities: ['customers', 'jobs', 'recurring_job_templates'],
      automationCapabilities: [
        'Auto-identify due services',
        'Proactive scheduling alerts',
        'Seasonal timing optimization'
      ]
    },
    {
      id: 'generate_jobs',
      name: 'Generate Recurring Jobs',
      order: 2,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Schedule Identification step',
        input: 'Due maintenance items',
        process: 'Create job from recurring template. Set appropriate dates. Link to customer and previous services. Pre-populate details from last visit.',
        output: 'Generated maintenance jobs',
        customer: 'Scheduling Process'
      },
      tools: ['create_job', 'schedule_job'],
      dbEntities: ['jobs', 'recurring_job_templates'],
      automationCapabilities: [
        'Auto-generate from templates',
        'Smart date selection',
        'Batch job creation'
      ]
    },
    {
      id: 'notify_customer',
      name: 'Notify Customer',
      order: 3,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Job Generation step',
        input: 'Scheduled maintenance job',
        process: 'Send upcoming service reminder. Include service details and date. Offer rescheduling options. Confirm customer availability.',
        output: 'Customer notified and confirmed',
        customer: 'Customer'
      },
      tools: ['send_job_confirmation', 'send_email'],
      dbEntities: ['mail_sends', 'jobs'],
      automationCapabilities: [
        'Auto-send reminders at optimal timing',
        'Multi-channel notifications',
        'Self-service rescheduling'
      ]
    },
    {
      id: 'track_history',
      name: 'Track Service History',
      order: 4,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Completed Service',
        input: 'Service completion data',
        process: 'Record service details and findings. Update equipment records. Note any recommendations. Calculate next service date.',
        output: 'Updated service history',
        customer: 'Future Maintenance cycles'
      },
      tools: ['get_job', 'list_jobs', 'update_customer'],
      dbEntities: ['jobs', 'customers'],
      automationCapabilities: [
        'Auto-log service history',
        'Equipment health tracking',
        'Predictive maintenance suggestions'
      ]
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

export const INVOICING: EnhancedProcessDefinition = {
  id: 'invoicing',
  name: 'Invoicing',
  description: 'Generate and send invoices for completed work',
  phase: 'post_service',
  position: 9,
  order: 1,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Quality Assurance',
      'Job Records',
      'Quote/Pricing Data'
    ],
    inputs: [
      'Completed Job',
      'Quote Line Items',
      'Additional Work Items',
      'Customer Information'
    ],
    processSteps: [
      '1. Review Completed Job',
      '2. Create Invoice',
      '3. Review Invoice',
      '4. Send Invoice'
    ],
    outputs: [
      'Invoice Document',
      'Payment Request',
      'Customer Notification',
      'AR Record'
    ],
    customers: [
      'Customer',
      'Payment Collection',
      'Accounting'
    ]
  },

  subSteps: [
    {
      id: 'review_job',
      name: 'Review Completed Job',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Quality Assurance',
        input: 'Completed and approved job',
        process: 'Verify job is marked complete. Review quote for agreed pricing. Check for any change orders or additional work. Gather all billable items.',
        output: 'Job data ready for invoicing',
        customer: 'Invoice Creation step'
      },
      tools: ['get_job', 'get_quote'],
      dbEntities: ['jobs', 'quotes', 'quote_line_items'],
      automationCapabilities: [
        'Auto-trigger on job completion',
        'Flag jobs ready for invoicing',
        'Compile billable items'
      ]
    },
    {
      id: 'create_invoice',
      name: 'Create Invoice',
      order: 2,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Review step',
        input: 'Billable items and pricing',
        process: 'Generate invoice number. Create invoice linked to customer and job. Add line items from quote. Apply tax rate. Calculate totals.',
        output: 'Draft invoice',
        customer: 'Review step'
      },
      tools: ['create_invoice', 'create_invoice_line_item'],
      dbEntities: ['invoices', 'invoice_line_items'],
      automationCapabilities: [
        'Auto-generate from quote',
        'Sequential numbering',
        'Tax calculation'
      ]
    },
    {
      id: 'review_invoice',
      name: 'Review Invoice',
      order: 3,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Creation step',
        input: 'Draft invoice',
        process: 'Verify amounts are correct. Check customer details. Review payment terms. Add any notes or special instructions. Approve for sending.',
        output: 'Approved invoice',
        customer: 'Sending step'
      },
      tools: ['get_invoice', 'update_invoice', 'update_invoice_line_item'],
      dbEntities: ['invoices', 'invoice_line_items'],
      automationCapabilities: [
        'Automatic accuracy checks',
        'Comparison to quote',
        'Approval workflow'
      ]
    },
    {
      id: 'send_invoice',
      name: 'Send Invoice',
      order: 4,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Review step',
        input: 'Approved invoice',
        process: 'Format invoice for delivery. Send via email with PDF attachment. Include payment link. Update status to Sent. Log delivery.',
        output: 'Invoice delivered to customer',
        customer: 'Customer / Payment Collection'
      },
      tools: ['send_invoice', 'update_invoice'],
      dbEntities: ['invoices', 'mail_sends'],
      automationCapabilities: [
        'Auto-send on approval',
        'Include online payment link',
        'Delivery confirmation'
      ]
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
    'void_invoice',
    'get_job',
    'get_quote'
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

export const PAYMENT_COLLECTION: EnhancedProcessDefinition = {
  id: 'payment_collection',
  name: 'Payment Collection',
  description: 'Collect and process customer payments',
  phase: 'post_service',
  position: 10,
  order: 2,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Invoicing Process',
      'Payment Gateway',
      'Customer'
    ],
    inputs: [
      'Sent Invoice',
      'Payment Attempt',
      'Payment Method',
      'Customer Account'
    ],
    processSteps: [
      '1. Track Outstanding Invoices',
      '2. Send Payment Reminders',
      '3. Process Payment',
      '4. Issue Receipt'
    ],
    outputs: [
      'Payment Record',
      'Updated Invoice Status',
      'Receipt',
      'AR Update'
    ],
    customers: [
      'Customer',
      'Accounting',
      'Reviews Process'
    ]
  },

  subSteps: [
    {
      id: 'track_outstanding',
      name: 'Track Outstanding Invoices',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Invoicing Process',
        input: 'Sent invoices',
        process: 'Monitor invoice status. Calculate days outstanding. Identify overdue invoices. Prioritize follow-up by age and amount.',
        output: 'Outstanding invoice report',
        customer: 'Reminder step'
      },
      tools: ['list_invoices', 'get_invoice'],
      dbEntities: ['invoices'],
      automationCapabilities: [
        'Real-time aging report',
        'Auto-flag overdue',
        'Priority scoring'
      ]
    },
    {
      id: 'send_reminders',
      name: 'Send Payment Reminders',
      order: 2,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Tracking step',
        input: 'Overdue invoices',
        process: 'Send reminder at 7 days. Escalate messaging at 14, 30 days. Include payment link. Offer payment plans if needed.',
        output: 'Reminder sent to customer',
        customer: 'Customer'
      },
      tools: ['send_invoice', 'send_email'],
      dbEntities: ['mail_sends', 'invoices'],
      automationCapabilities: [
        'Scheduled reminder sequence',
        'Escalating tone',
        'Payment plan offers'
      ]
    },
    {
      id: 'process_payment',
      name: 'Process Payment',
      order: 3,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Customer / Payment Gateway',
        input: 'Payment attempt',
        process: 'Receive payment via card, bank, or manual entry. Process through payment gateway. Record payment against invoice. Update invoice status.',
        output: 'Payment recorded',
        customer: 'Receipt step'
      },
      tools: ['record_payment', 'update_invoice'],
      dbEntities: ['payments', 'invoices'],
      automationCapabilities: [
        'Online payment processing',
        'Auto-apply to invoice',
        'Partial payment handling'
      ]
    },
    {
      id: 'issue_receipt',
      name: 'Issue Receipt',
      order: 4,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Payment step',
        input: 'Confirmed payment',
        process: 'Generate payment receipt. Send confirmation email. Update customer account. Mark invoice as Paid.',
        output: 'Receipt delivered, invoice closed',
        customer: 'Customer / Reviews Process'
      },
      tools: ['send_email', 'update_invoice'],
      dbEntities: ['payments', 'invoices', 'mail_sends'],
      automationCapabilities: [
        'Auto-send receipt on payment',
        'Thank you messaging',
        'Trigger review request'
      ]
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

export const REVIEWS_REPUTATION: EnhancedProcessDefinition = {
  id: 'reviews_reputation',
  name: 'Reviews & Reputation',
  description: 'Collect customer feedback and manage online reputation',
  phase: 'post_service',
  position: 11,
  order: 3,
  depth: 0,
  currentState: 'DIY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Payment Collection',
      'Customer',
      'Review Platforms'
    ],
    inputs: [
      'Completed and Paid Job',
      'Customer Satisfaction Data',
      'Review Platform APIs'
    ],
    processSteps: [
      '1. Request Customer Review',
      '2. Monitor Reviews',
      '3. Respond to Reviews',
      '4. Analyze Feedback'
    ],
    outputs: [
      'Review Requests Sent',
      'Review Responses',
      'Reputation Metrics',
      'Improvement Insights'
    ],
    customers: [
      'Marketing',
      'Management',
      'Future Customers'
    ]
  },

  subSteps: [
    {
      id: 'request_review',
      name: 'Request Customer Review',
      order: 1,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Payment Collection',
        input: 'Paid invoice and completed job',
        process: 'Trigger review request after payment. Send personalized email with review links. Include Google, Yelp, or other platform options. Time appropriately after service.',
        output: 'Review request sent',
        customer: 'Customer'
      },
      tools: ['send_email'],
      dbEntities: ['mail_sends', 'jobs'],
      automationCapabilities: [
        'Auto-trigger on payment',
        'Optimal timing calculation',
        'Multi-platform links'
      ]
    },
    {
      id: 'monitor_reviews',
      name: 'Monitor Reviews',
      order: 2,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Review Platforms',
        input: 'New reviews across platforms',
        process: 'Check for new reviews daily. Aggregate ratings. Alert on negative reviews. Track review volume trends.',
        output: 'Review monitoring report',
        customer: 'Response step'
      },
      tools: [],
      dbEntities: [],
      automationCapabilities: [
        'Platform API monitoring',
        'Negative review alerts',
        'Rating aggregation'
      ]
    },
    {
      id: 'respond_reviews',
      name: 'Respond to Reviews',
      order: 3,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Monitoring step',
        input: 'New reviews requiring response',
        process: 'Craft appropriate response. Thank positive reviewers. Address concerns in negative reviews. Maintain professional tone.',
        output: 'Review responses posted',
        customer: 'Future Customers / Management'
      },
      tools: [],
      dbEntities: [],
      automationCapabilities: [
        'AI-drafted responses',
        'Response templates',
        'Approval workflow'
      ]
    },
    {
      id: 'analyze_feedback',
      name: 'Analyze Feedback',
      order: 4,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Reviews and ratings',
        input: 'Accumulated feedback data',
        process: 'Identify common themes. Track sentiment over time. Highlight improvement opportunities. Report to management.',
        output: 'Feedback analysis report',
        customer: 'Management'
      },
      tools: ['get_customer', 'update_customer'],
      dbEntities: ['customers'],
      automationCapabilities: [
        'Sentiment analysis',
        'Theme extraction',
        'Trend reporting'
      ]
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

export const WARRANTY_MANAGEMENT: EnhancedProcessDefinition = {
  id: 'warranty_management',
  name: 'Warranty Management',
  description: 'Handle warranty claims and post-service issues',
  phase: 'post_service',
  position: 12,
  order: 4,
  depth: 0,
  currentState: 'DIY',
  targetState: 'DWY',
  
  sipoc: {
    suppliers: [
      'Customer',
      'Service Records',
      'Warranty Terms'
    ],
    inputs: [
      'Warranty Claim',
      'Original Job Details',
      'Warranty Coverage Terms',
      'Customer History'
    ],
    processSteps: [
      '1. Receive Warranty Claim',
      '2. Evaluate Claim',
      '3. Schedule Warranty Work',
      '4. Resolve Claim'
    ],
    outputs: [
      'Claim Decision',
      'Warranty Job',
      'Resolution Documentation',
      'Customer Satisfaction'
    ],
    customers: [
      'Customer',
      'Quality Assurance',
      'Management'
    ]
  },

  subSteps: [
    {
      id: 'receive_claim',
      name: 'Receive Warranty Claim',
      order: 1,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Customer',
        input: 'Customer complaint or issue report',
        process: 'Log customer claim. Capture issue description. Link to original job. Acknowledge receipt to customer.',
        output: 'Logged warranty claim',
        customer: 'Evaluation step'
      },
      tools: ['create_request', 'get_job', 'get_customer'],
      dbEntities: ['requests', 'jobs', 'customers'],
      automationCapabilities: [
        'Self-service claim submission',
        'Auto-link to original job',
        'Receipt acknowledgment'
      ]
    },
    {
      id: 'evaluate_claim',
      name: 'Evaluate Claim',
      order: 2,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Claim Receipt step',
        input: 'Warranty claim details',
        process: 'Review original job details. Check warranty coverage dates. Assess if issue is covered. Determine if site visit needed.',
        output: 'Claim coverage decision',
        customer: 'Scheduling step (if approved)'
      },
      tools: ['get_job', 'get_quote', 'list_jobs'],
      dbEntities: ['jobs', 'quotes'],
      automationCapabilities: [
        'Auto-check warranty period',
        'Coverage determination rules',
        'Decision recommendation'
      ]
    },
    {
      id: 'schedule_repair',
      name: 'Schedule Warranty Work',
      order: 3,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Evaluation step',
        input: 'Approved warranty claim',
        process: 'Create warranty job. Schedule return visit. Assign to appropriate technician (preferably original). Notify customer of schedule.',
        output: 'Scheduled warranty job',
        customer: 'Dispatching Process'
      },
      tools: ['create_job', 'schedule_job', 'assign_job', 'send_job_confirmation'],
      dbEntities: ['jobs', 'job_assignments'],
      automationCapabilities: [
        'Auto-create warranty job',
        'Prefer original technician',
        'Priority scheduling'
      ]
    },
    {
      id: 'resolve_claim',
      name: 'Resolve Claim',
      order: 4,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Completed warranty work',
        input: 'Completed repair/resolution',
        process: 'Document resolution. Get customer sign-off. Close warranty claim. Update original job record. Follow up on satisfaction.',
        output: 'Resolved claim with documentation',
        customer: 'Customer / Management'
      },
      tools: ['update_job', 'update_request'],
      dbEntities: ['jobs', 'requests'],
      automationCapabilities: [
        'Resolution documentation',
        'Customer satisfaction survey',
        'Quality feedback loop'
      ]
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
    'update_job',
    'send_job_confirmation',
    'get_quote',
    'get_customer'
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

export const INVENTORY_MANAGEMENT: EnhancedProcessDefinition = {
  id: 'inventory_management',
  name: 'Inventory Management',
  description: 'Track and replenish parts and supplies',
  phase: 'operations',
  position: 13,
  order: 1,
  depth: 0,
  currentState: 'DIY',
  targetState: 'DWY',
  
  sipoc: {
    suppliers: [
      'Vendors/Suppliers',
      'Job Completion Process',
      'Purchasing Team'
    ],
    inputs: [
      'Inventory Counts',
      'Job Material Usage',
      'Reorder Points',
      'Supplier Catalog'
    ],
    processSteps: [
      '1. Check Inventory Levels',
      '2. Identify Reorder Needs',
      '3. Create Purchase Order',
      '4. Receive Stock',
      '5. Track Usage by Job'
    ],
    outputs: [
      'Inventory Status Report',
      'Purchase Orders',
      'Updated Stock Levels',
      'Job Cost Allocation'
    ],
    customers: [
      'Field Operations',
      'Purchasing',
      'Accounting'
    ]
  },

  subSteps: [
    {
      id: 'check_levels',
      name: 'Check Inventory Levels',
      order: 1,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Inventory System',
        input: 'Current stock quantities',
        process: 'Query all inventory items. Compare current vs. minimum levels. Calculate days of supply. Generate status report.',
        output: 'Inventory status report',
        customer: 'Reorder step'
      },
      tools: ['get_inventory', 'list_inventory'],
      dbEntities: ['inventory_items'],
      automationCapabilities: [
        'Real-time stock levels',
        'Days-of-supply calculation',
        'Dashboard visualization'
      ]
    },
    {
      id: 'identify_reorder',
      name: 'Identify Reorder Needs',
      order: 2,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Level Check step',
        input: 'Items below minimum',
        process: 'Filter items at or below reorder point. Calculate reorder quantity. Consider upcoming job needs. Prioritize critical items.',
        output: 'Reorder recommendations',
        customer: 'Purchase Order step'
      },
      tools: ['list_inventory'],
      dbEntities: ['inventory_items'],
      automationCapabilities: [
        'Auto-flag low stock',
        'Demand forecasting',
        'Reorder quantity optimization'
      ]
    },
    {
      id: 'create_order',
      name: 'Create Purchase Order',
      order: 3,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Reorder step',
        input: 'Reorder recommendations',
        process: 'Select supplier for each item. Create purchase order. Submit to supplier. Track order status.',
        output: 'Submitted purchase order',
        customer: 'Receiving step'
      },
      tools: ['update_inventory'],
      dbEntities: ['inventory_items'],
      automationCapabilities: [
        'Supplier auto-selection',
        'PO generation',
        'Order tracking'
      ]
    },
    {
      id: 'receive_stock',
      name: 'Receive Stock',
      order: 4,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Supplier delivery',
        input: 'Received shipment',
        process: 'Verify quantities received. Check for damage. Update inventory counts. Record receipt date. Store in appropriate location.',
        output: 'Updated inventory levels',
        customer: 'Field Operations'
      },
      tools: ['update_inventory'],
      dbEntities: ['inventory_items', 'inventory_transactions'],
      automationCapabilities: [
        'Barcode scanning',
        'Auto-update quantities',
        'Receipt documentation'
      ]
    },
    {
      id: 'track_usage',
      name: 'Track Usage by Job',
      order: 5,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Job Completion',
        input: 'Materials used on job',
        process: 'Record materials consumed per job. Deduct from inventory. Calculate job material costs. Update usage history.',
        output: 'Job cost allocation',
        customer: 'Accounting / Job Costing'
      },
      tools: ['update_inventory', 'get_job'],
      dbEntities: ['inventory_items', 'inventory_transactions', 'jobs'],
      automationCapabilities: [
        'Usage logging at job',
        'Auto-deduction',
        'Cost tracking per job'
      ]
    }
  ],

  tools: [
    'get_inventory',
    'list_inventory',
    'update_inventory',
    'create_inventory_item',
    'delete_inventory_item',
    'get_job'
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

export const REPORTING_ANALYTICS: EnhancedProcessDefinition = {
  id: 'reporting_analytics',
  name: 'Reporting & Analytics',
  description: 'Track business performance and generate reports',
  phase: 'operations',
  position: 14,
  order: 2,
  depth: 0,
  currentState: 'DIY',
  targetState: 'DWY',
  
  sipoc: {
    suppliers: [
      'All Business Processes',
      'Database',
      'External Systems'
    ],
    inputs: [
      'Job Data',
      'Financial Data',
      'Customer Data',
      'Team Performance Data'
    ],
    processSteps: [
      '1. Collect Performance Data',
      '2. Generate Reports',
      '3. Identify Trends',
      '4. Export Data'
    ],
    outputs: [
      'Performance Reports',
      'Financial Summaries',
      'Trend Analysis',
      'Executive Dashboard'
    ],
    customers: [
      'Management',
      'Accounting',
      'Operations Team'
    ]
  },

  subSteps: [
    {
      id: 'collect_data',
      name: 'Collect Performance Data',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'All Systems',
        input: 'Raw business data',
        process: 'Aggregate data from jobs, invoices, quotes, customers. Calculate KPIs. Prepare data for reporting.',
        output: 'Aggregated metrics',
        customer: 'Report Generation step'
      },
      tools: ['list_jobs', 'list_invoices', 'list_quotes', 'list_customers'],
      dbEntities: ['jobs', 'invoices', 'quotes', 'customers', 'payments'],
      automationCapabilities: [
        'Real-time data aggregation',
        'KPI calculation',
        'Data quality checks'
      ]
    },
    {
      id: 'generate_reports',
      name: 'Generate Reports',
      order: 2,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Data Collection step',
        input: 'Aggregated metrics',
        process: 'Generate standard reports. Create visualizations. Format for stakeholders.',
        output: 'Formatted reports',
        customer: 'Management'
      },
      tools: [],
      dbEntities: [],
      automationCapabilities: [
        'Scheduled report generation',
        'Custom report builder',
        'Email delivery'
      ]
    },
    {
      id: 'identify_trends',
      name: 'Identify Trends',
      order: 3,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Report Generation step',
        input: 'Historical data and reports',
        process: 'Analyze patterns over time. Identify growth/decline trends. Highlight anomalies. Recommend actions.',
        output: 'Trend analysis',
        customer: 'Management'
      },
      tools: [],
      dbEntities: [],
      automationCapabilities: [
        'AI trend detection',
        'Anomaly alerting',
        'Predictive insights'
      ]
    },
    {
      id: 'export_data',
      name: 'Export Data',
      order: 4,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'User request',
        input: 'Data export request',
        process: 'Extract requested data. Format for external systems. Export to CSV, Excel, or API.',
        output: 'Exported data files',
        customer: 'External Systems / Accounting'
      },
      tools: [],
      dbEntities: [],
      automationCapabilities: [
        'Scheduled exports',
        'Multiple format support',
        'API integrations'
      ]
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

export const SEASONAL_PLANNING: EnhancedProcessDefinition = {
  id: 'seasonal_planning',
  name: 'Seasonal Planning',
  description: 'Prepare for seasonal demand changes',
  phase: 'operations',
  position: 15,
  order: 3,
  depth: 0,
  currentState: 'DIY',
  targetState: 'DWY',
  
  sipoc: {
    suppliers: [
      'Historical Data',
      'Market Trends',
      'Weather Data'
    ],
    inputs: [
      'Historical Job Volume',
      'Revenue Patterns',
      'Market Forecasts',
      'Team Capacity'
    ],
    processSteps: [
      '1. Analyze Historical Patterns',
      '2. Forecast Demand',
      '3. Plan Capacity',
      '4. Prepare Marketing Campaigns'
    ],
    outputs: [
      'Demand Forecast',
      'Staffing Plan',
      'Inventory Plan',
      'Marketing Calendar'
    ],
    customers: [
      'Management',
      'HR/Staffing',
      'Marketing',
      'Operations'
    ]
  },

  subSteps: [
    {
      id: 'analyze_history',
      name: 'Analyze Historical Patterns',
      order: 1,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Historical Database',
        input: 'Past years job and revenue data',
        process: 'Extract historical data by month/season. Identify peak and slow periods. Calculate growth rates. Compare year-over-year.',
        output: 'Historical pattern analysis',
        customer: 'Forecasting step'
      },
      tools: ['list_jobs', 'list_invoices'],
      dbEntities: ['jobs', 'invoices'],
      automationCapabilities: [
        'Multi-year trend analysis',
        'Seasonality detection',
        'Growth rate calculation'
      ]
    },
    {
      id: 'forecast_demand',
      name: 'Forecast Demand',
      order: 2,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Historical Analysis',
        input: 'Pattern data and market factors',
        process: 'Project upcoming season demand. Account for market trends. Consider growth targets. Generate demand forecast.',
        output: 'Demand forecast',
        customer: 'Capacity Planning step'
      },
      tools: [],
      dbEntities: [],
      automationCapabilities: [
        'AI demand forecasting',
        'Scenario modeling',
        'Confidence intervals'
      ]
    },
    {
      id: 'plan_capacity',
      name: 'Plan Capacity',
      order: 3,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Demand Forecast',
        input: 'Expected demand and current capacity',
        process: 'Compare forecast to current capacity. Identify staffing gaps. Plan inventory needs. Schedule training if needed.',
        output: 'Capacity plan',
        customer: 'HR / Purchasing'
      },
      tools: ['list_team_members', 'list_inventory'],
      dbEntities: ['business_members', 'inventory_items'],
      automationCapabilities: [
        'Capacity gap analysis',
        'Staffing recommendations',
        'Inventory pre-ordering'
      ]
    },
    {
      id: 'prepare_campaigns',
      name: 'Prepare Marketing Campaigns',
      order: 4,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Seasonal Plan',
        input: 'Target services and timing',
        process: 'Plan seasonal promotions. Prepare marketing materials. Schedule campaign launches. Set up tracking.',
        output: 'Marketing calendar',
        customer: 'Marketing / Sales'
      },
      tools: [],
      dbEntities: [],
      automationCapabilities: [
        'Campaign templates',
        'Automated scheduling',
        'Customer segmentation'
      ]
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

export const PROCESS_REGISTRY: Record<string, EnhancedProcessDefinition> = {
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
export function getToolProcess(toolName: string): EnhancedProcessDefinition | null {
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
export function getToolSubStep(processId: string, toolName: string): EnhancedSubStep | null {
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
export function getPhaseProcesses(phase: ProcessPhase): EnhancedProcessDefinition[] {
  return Object.values(PROCESS_REGISTRY)
    .filter(p => p.phase === phase)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get the next logical processes from a given process
 */
export function getNextProcesses(processId: string): EnhancedProcessDefinition[] {
  const process = PROCESS_REGISTRY[processId];
  if (!process) return [];
  
  return process.nextProcesses
    .map(id => PROCESS_REGISTRY[id])
    .filter(Boolean);
}

/**
 * Check if a transition from one process to another is valid
 */
export function isValidTransition(fromProcessId: string, toProcessId: string): boolean {
  const fromProcess = PROCESS_REGISTRY[fromProcessId];
  if (!fromProcess) return false;
  
  // Check if it's a direct next process
  if (fromProcess.nextProcesses.includes(toProcessId)) return true;
  
  // Check if it's in the next phase
  const fromPhase = PHASE_REGISTRY[fromProcess.phase];
  const toProcess = PROCESS_REGISTRY[toProcessId];
  if (toProcess && fromPhase.nextPhases.includes(toProcess.phase)) return true;
  
  return false;
}

/**
 * Get the current phase based on context
 */
export function getCurrentPhase(context: Record<string, any>): ProcessPhase {
  // Determine phase based on what entities exist
  if (context.invoice_id || context.payment_id) return 'post_service';
  if (context.job_status === 'In Progress' || context.job_status === 'Completed') return 'service_delivery';
  if (context.job_id || context.quote_id) return 'pre_service';
  return 'pre_service';
}

/**
 * Check if entry conditions are met for a process
 */
export function checkEntryConditions(
  processId: string,
  context: Record<string, any>
): { valid: boolean; missing: string[] } {
  const process = PROCESS_REGISTRY[processId];
  if (!process) return { valid: false, missing: ['Process not found'] };
  
  const missing: string[] = [];
  
  for (const condition of process.entryConditions) {
    if (!evaluateCondition(condition, context)) {
      missing.push(`${condition.entity || condition.field} ${condition.type}`);
    }
  }
  
  return { valid: missing.length === 0, missing };
}

/**
 * Check if exit conditions are met for a process
 */
export function checkExitConditions(
  processId: string,
  context: Record<string, any>
): { complete: boolean; pending: string[] } {
  const process = PROCESS_REGISTRY[processId];
  if (!process) return { complete: false, pending: ['Process not found'] };
  
  const pending: string[] = [];
  
  for (const condition of process.exitConditions) {
    if (!evaluateCondition(condition, context)) {
      pending.push(`${condition.entity || condition.field} ${condition.type}`);
    }
  }
  
  return { complete: pending.length === 0, pending };
}

/**
 * Evaluate a single condition against context
 */
function evaluateCondition(condition: Condition, context: Record<string, any>): boolean {
  switch (condition.type) {
    case 'entity_exists':
      return context[`${condition.entity}_id`] != null || context[condition.entity!] != null;
    
    case 'status_equals':
      const entityKey = condition.entity!;
      const statusValue = context[`${entityKey}_status`] || 
                          (context[entityKey] && context[entityKey].status);
      return statusValue === condition.value;
    
    case 'context_check':
      const fieldValue = getNestedValue(context, condition.field!);
      return compareValues(fieldValue, condition.operator!, condition.value);
    
    case 'db_check':
      // DB checks would need async evaluation - return true for now
      return true;
    
    default:
      return false;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Compare values based on operator
 */
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

// ============================================================================
// SIPOC & AUTOMATION HELPER FUNCTIONS
// ============================================================================

/**
 * Get automation progress for a process
 */
export function getAutomationProgress(process: EnhancedProcessDefinition): {
  current: number;
  target: number;
  stepsAutomated: number;
  stepsTotal: number;
  percentComplete: number;
} {
  const stateScore = { 'DIY': 0, 'DWY': 50, 'DFY': 100 };
  const stepsTotal = process.subSteps.length;
  const stepsAutomated = process.subSteps.filter(s => s.currentState === 'DFY').length;
  
  const currentScore = process.subSteps.reduce((sum, s) => sum + stateScore[s.currentState], 0) / stepsTotal;
  const targetScore = process.subSteps.reduce((sum, s) => sum + stateScore[s.targetState], 0) / stepsTotal;
  
  return {
    current: stateScore[process.currentState],
    target: stateScore[process.targetState],
    stepsAutomated,
    stepsTotal,
    percentComplete: Math.round((currentScore / targetScore) * 100)
  };
}

/**
 * Get all automation opportunities (steps not yet at target state)
 */
export function getAutomationOpportunities(process: EnhancedProcessDefinition): EnhancedSubStep[] {
  return process.subSteps.filter(s => s.currentState !== s.targetState);
}

/**
 * Get tools needed for a specific sub-step
 */
export function getSubStepTools(processId: string, subStepId: string): string[] {
  const process = PROCESS_REGISTRY[processId];
  const subStep = process?.subSteps.find(s => s.id === subStepId);
  return subStep?.tools || [];
}

/**
 * Get SIPOC summary for display
 */
export function getSIPOCSummary(process: EnhancedProcessDefinition): string {
  const { sipoc } = process;
  return `
Suppliers: ${sipoc.suppliers.join(', ')}
Inputs: ${sipoc.inputs.slice(0, 3).join(', ')}${sipoc.inputs.length > 3 ? '...' : ''}
Steps: ${sipoc.processSteps.length} steps
Outputs: ${sipoc.outputs.slice(0, 3).join(', ')}${sipoc.outputs.length > 3 ? '...' : ''}
Customers: ${sipoc.customers.join(', ')}
  `.trim();
}

/**
 * Get process flow diagram in Mermaid format
 */
export function getProcessFlowDiagram(processId: string): string {
  const process = PROCESS_REGISTRY[processId];
  if (!process) return '';
  
  const stateColors: Record<AutomationState, string> = {
    'DFY': '#bbf7d0',  // Green - fully automated
    'DWY': '#fef3c7',  // Yellow - assisted
    'DIY': '#fecaca'   // Red - manual
  };
  
  const nodes = process.subSteps.map((step, i) => {
    const letter = String.fromCharCode(65 + i);
    return `    ${letter}[${step.order}. ${step.name}]`;
  });
  
  const connections = process.subSteps.slice(0, -1).map((_, i) => 
    `    ${String.fromCharCode(65 + i)} --> ${String.fromCharCode(66 + i)}`
  );
  
  const styles = process.subSteps.map((step, i) => {
    const letter = String.fromCharCode(65 + i);
    const color = stateColors[step.currentState];
    return `    style ${letter} fill:${color}`;
  });
  
  return `flowchart LR
  subgraph Parent["${process.name} (${process.currentState} → ${process.targetState})"]
    direction TB
${nodes.join('\n')}
${connections.join('\n')}
  end
${styles.join('\n')}`;
}

/**
 * Get all processes by automation state
 */
export function getProcessesByState(state: AutomationState): EnhancedProcessDefinition[] {
  return Object.values(PROCESS_REGISTRY).filter(p => p.currentState === state);
}

/**
 * Get database entities used across a process
 */
export function getProcessDbEntities(processId: string): string[] {
  const process = PROCESS_REGISTRY[processId];
  if (!process) return [];
  
  const entities = new Set<string>();
  for (const subStep of process.subSteps) {
    for (const entity of subStep.dbEntities) {
      entities.add(entity);
    }
  }
  return Array.from(entities);
}

/**
 * Get all automation capabilities for a process
 */
export function getProcessAutomationCapabilities(processId: string): string[] {
  const process = PROCESS_REGISTRY[processId];
  if (!process) return [];
  
  return process.subSteps.flatMap(s => s.automationCapabilities);
}

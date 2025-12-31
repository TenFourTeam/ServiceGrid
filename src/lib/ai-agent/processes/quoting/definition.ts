/**
 * Quoting Process Definition
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ProcessDefinition } from '../types';

export const DEFINITION: ProcessDefinition = {
  id: PROCESS_IDS.QUOTING,
  name: 'Quoting & Estimating',
  description: 'Create accurate quotes based on site assessment data, service catalog, and pricing rules',
  phase: 'pre_service',
  position: 4,
  order: 4,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Site Assessment Team',
      'Service Catalog',
      'Pricing Engine',
      'Customer Records'
    ],
    inputs: [
      'Assessment Report/Photos',
      'Service Requirements',
      'Customer Address/Property Details',
      'Pricing Rules & Discounts',
      'Material Costs'
    ],
    processSteps: [
      '1. Gather Assessment Data',
      '2. Select Services & Products',
      '3. Calculate Costs & Pricing',
      '4. Apply Discounts/Adjustments',
      '5. Generate Quote Document',
      '6. Review & Send Quote'
    ],
    outputs: [
      'Quote Document with Line Items',
      'Quote Sent Notification',
      'Customer Portal Link',
      'Quote Follow-up Task'
    ],
    customers: [
      'Customer (receives quote)',
      'Sales Team (tracks conversion)',
      'Scheduling (upon approval)'
    ]
  },

  subSteps: [
    {
      id: 'gather_assessment',
      name: 'Gather Assessment Data',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Site Assessment Process',
        input: 'Assessment job with photos, measurements, and risk tags',
        process: 'Review completed assessment job. Extract relevant photos and measurements. Note any risk factors or special requirements. Pull customer property details from existing records.',
        output: 'Compiled assessment data ready for pricing',
        customer: 'Service Selection (next step)'
      },
      tools: ['get_job', 'list_job_media', 'get_customer', 'get_request'],
      dbEntities: ['jobs', 'sg_media', 'customers', 'requests'],
      automationCapabilities: [
        'Auto-load assessment data when creating quote',
        'Extract measurements from tagged photos',
        'Pre-populate property details from customer record'
      ]
    },
    {
      id: 'select_services',
      name: 'Select Services & Products',
      order: 2,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Service Catalog',
        input: 'Assessment data and customer requirements',
        process: 'Match assessment findings to service catalog items. Select appropriate services based on property size and condition. Add any required materials or products. Configure service options.',
        output: 'Selected services and products list',
        customer: 'Cost Calculation (next step)'
      },
      tools: ['list_services', 'get_service', 'search_services'],
      dbEntities: ['service_catalog', 'quote_line_items'],
      automationCapabilities: [
        'AI suggests services based on assessment photos',
        'Auto-calculate quantities from measurements',
        'Bundle frequently combined services'
      ]
    },
    {
      id: 'calculate_costs',
      name: 'Calculate Costs & Pricing',
      order: 3,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Pricing Engine / Service Catalog',
        input: 'Selected services with quantities',
        process: 'Apply service pricing from catalog. Calculate material costs. Factor in labor time estimates. Apply tax rates. Calculate subtotals and totals.',
        output: 'Priced line items with totals',
        customer: 'Discount Application (next step)'
      },
      tools: ['create_quote', 'add_quote_line_item', 'update_quote'],
      dbEntities: ['quotes', 'quote_line_items'],
      automationCapabilities: [
        'Auto-calculate from service catalog prices',
        'Apply seasonal pricing adjustments',
        'Factor in travel time based on location'
      ]
    },
    {
      id: 'apply_discounts',
      name: 'Apply Discounts & Adjustments',
      order: 4,
      currentState: 'DIY',
      targetState: 'DWY',
      sipoc: {
        supplier: 'Pricing Rules / Sales Team',
        input: 'Calculated quote with line items',
        process: 'Check for applicable discounts (volume, loyalty, seasonal). Apply customer-specific pricing. Add any manual adjustments. Recalculate totals.',
        output: 'Final quote with all adjustments applied',
        customer: 'Quote Generation (next step)'
      },
      tools: ['update_quote', 'update_quote_line_item'],
      dbEntities: ['quotes', 'quote_line_items'],
      automationCapabilities: [
        'Auto-apply loyalty discounts',
        'Suggest volume discounts',
        'Track discount approval workflow'
      ]
    },
    {
      id: 'generate_quote',
      name: 'Generate Quote Document',
      order: 5,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Quote Builder',
        input: 'Final quote with all line items and pricing',
        process: 'Generate professional quote document. Include company branding. Add terms and conditions. Generate unique quote number. Create customer portal link for acceptance.',
        output: 'Quote document ready for delivery',
        customer: 'Quote Delivery (next step)'
      },
      tools: ['get_quote', 'generate_quote_pdf'],
      dbEntities: ['quotes'],
      automationCapabilities: [
        'Auto-generate PDF on quote creation',
        'Auto-assign quote number via DB sequence',
        'Generate public viewing token'
      ]
    },
    {
      id: 'send_quote',
      name: 'Review & Send Quote',
      order: 6,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Sales Team / AI Agent',
        input: 'Quote document ready for delivery',
        process: 'Final review of quote accuracy. Select delivery method (email/portal). Send quote to customer. Log send activity. Set follow-up reminder.',
        output: 'Quote delivered to customer with tracking',
        customer: 'Customer (receives quote)'
      },
      tools: ['send_quote', 'update_quote', 'create_task'],
      dbEntities: ['quotes', 'mail_sends', 'email_queue'],
      automationCapabilities: [
        'Auto-send on approval',
        'Schedule follow-up reminders',
        'Track quote opens and views'
      ]
    }
  ],

  tools: [
    'get_job',
    'list_job_media',
    'get_customer',
    'get_request',
    'list_services',
    'get_service',
    'search_services',
    'create_quote',
    'update_quote',
    'get_quote',
    'add_quote_line_item',
    'update_quote_line_item',
    'delete_quote_line_item',
    'send_quote',
    'generate_quote_pdf',
    'create_task'
  ],
  
  inputContract: {
    customer_id: 'uuid',
    request_id: 'uuid?',
    job_id: 'uuid?',
    services: 'array?',
    notes: 'string?'
  },
  
  outputContract: {
    quote_id: 'uuid',
    quote_number: 'string',
    total: 'number',
    status: 'string',
    sent_at: 'timestamp?',
    public_token: 'string'
  },
  
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  
  exitConditions: [
    { type: 'entity_exists', entity: 'quote', field: 'id' },
    { type: 'status_equals', entity: 'quote', field: 'status', operator: 'in', value: ['Sent', 'Approved'] }
  ],
  
  userCheckpoints: ['quote_review', 'discount_approval'],
  
  nextProcesses: [PROCESS_IDS.SCHEDULING, PROCESS_IDS.INVOICING],
  previousProcesses: [PROCESS_IDS.SITE_ASSESSMENT, PROCESS_IDS.LEAD_GENERATION]
};

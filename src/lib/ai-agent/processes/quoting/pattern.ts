/**
 * Quoting Multi-Step Pattern
 */

import type { MultiStepPattern } from '../types';

export const PATTERN: MultiStepPattern = {
  id: 'complete_quoting',
  name: 'Complete Quoting Workflow',
  description: 'Create and send a professional quote from customer request or assessment data',
  category: 'pre-service',
  estimatedDurationMs: 45000,
  specialCardType: 'lead_workflow',
  
  steps: [
    {
      order: 1,
      tool: 'get_customer',
      description: 'Load customer details for the quote',
      inputMapping: {
        customer_id: 'input.customer_id'
      },
      outputKey: 'customer',
      optional: false,
      retryOnFail: true
    },
    {
      order: 2,
      tool: 'get_request',
      description: 'Load the service request if available',
      inputMapping: {
        request_id: 'input.request_id'
      },
      outputKey: 'request',
      optional: true,
      skipIf: '!input.request_id'
    },
    {
      order: 3,
      tool: 'get_job',
      description: 'Load assessment job if available',
      inputMapping: {
        job_id: 'input.job_id'
      },
      outputKey: 'assessment_job',
      optional: true,
      skipIf: '!input.job_id'
    },
    {
      order: 4,
      tool: 'list_job_media',
      description: 'Load assessment photos for reference',
      inputMapping: {
        job_id: 'input.job_id'
      },
      outputKey: 'assessment_media',
      optional: true,
      skipIf: '!input.job_id'
    },
    {
      order: 5,
      tool: 'create_quote',
      description: 'Create the quote with customer details',
      inputMapping: {
        customer_id: 'input.customer_id',
        request_id: 'input.request_id',
        notes: 'input.notes',
        address: 'customer.address'
      },
      outputKey: 'quote',
      optional: false,
      retryOnFail: true
    },
    {
      order: 6,
      tool: 'add_quote_line_item',
      description: 'Add service line items to quote',
      inputMapping: {
        quote_id: 'quote.id',
        services: 'input.services'
      },
      outputKey: 'line_items',
      optional: true,
      skipIf: '!input.services || input.services.length === 0'
    },
    {
      order: 7,
      tool: 'update_quote',
      description: 'Apply any discounts or adjustments',
      inputMapping: {
        quote_id: 'quote.id',
        discount: 'input.discount',
        discount_type: 'input.discount_type'
      },
      outputKey: 'updated_quote',
      optional: true,
      skipIf: '!input.discount'
    },
    {
      order: 8,
      tool: 'send_quote',
      description: 'Send the quote to the customer',
      inputMapping: {
        quote_id: 'quote.id'
      },
      outputKey: 'sent_quote',
      optional: true,
      skipIf: 'input.draft_only === true'
    }
  ],
  
  preconditions: [
    'input.customer_id must be provided',
    'Customer must exist in database',
    'Customer must have email for sending'
  ],
  
  postconditions: [
    'Quote record created in database',
    'Quote has valid quote number',
    'Quote status is Draft or Sent',
    'If sent, mail_sends record logged'
  ],
  
  successMetrics: [
    'quote_created',
    'line_items_added',
    'quote_sent_if_requested'
  ]
};

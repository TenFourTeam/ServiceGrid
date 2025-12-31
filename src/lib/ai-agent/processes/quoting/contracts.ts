/**
 * Quoting Tool Contracts
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ToolContract } from '../types';

export const CREATE_QUOTE_CONTRACT: ToolContract = {
  toolName: 'create_quote',
  description: 'Create a new quote for a customer',
  processId: PROCESS_IDS.QUOTING,
  subStepId: 'calculate_costs',
  
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

export const ADD_QUOTE_LINE_ITEM_CONTRACT: ToolContract = {
  toolName: 'add_quote_line_item',
  description: 'Add a line item to a quote',
  processId: PROCESS_IDS.QUOTING,
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
      description: 'Quote must not be approved',
      type: 'custom',
      customCheck: 'quote.status !== "Approved"'
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
        select: 'id, quote_id, description',
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

export const UPDATE_QUOTE_CONTRACT: ToolContract = {
  toolName: 'update_quote',
  description: 'Update an existing quote',
  processId: PROCESS_IDS.QUOTING,
  subStepId: 'apply_discounts',
  
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
      type: 'custom',
      customCheck: '["Draft", "Sent"].includes(quote.status)'
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

export const SEND_QUOTE_CONTRACT: ToolContract = {
  toolName: 'send_quote',
  description: 'Send a quote to the customer via email',
  processId: PROCESS_IDS.QUOTING,
  subStepId: 'send_quote',
  
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
    },
    {
      id: 'quote_has_lines',
      description: 'Quote must have at least one line item',
      type: 'custom',
      customCheck: 'quote.line_items && quote.line_items.length > 0'
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

export const APPROVE_QUOTE_CONTRACT: ToolContract = {
  toolName: 'approve_quote',
  description: 'Mark a quote as approved (customer accepted)',
  processId: PROCESS_IDS.QUOTING,
  subStepId: 'send_quote',
  
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
      id: 'quote_sent',
      description: 'Quote must be in Sent status',
      type: 'field_equals',
      entity: 'quote',
      field: 'status',
      value: 'Sent'
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
  
  invariants: [],
  
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
  
  rollbackTool: 'update_quote',
  rollbackArgs: { quote_id: 'args.quote_id', status: 'Sent' }
};

/**
 * All contracts for the Quoting process
 */
export const CONTRACTS: ToolContract[] = [
  CREATE_QUOTE_CONTRACT,
  ADD_QUOTE_LINE_ITEM_CONTRACT,
  UPDATE_QUOTE_CONTRACT,
  SEND_QUOTE_CONTRACT,
  APPROVE_QUOTE_CONTRACT,
];

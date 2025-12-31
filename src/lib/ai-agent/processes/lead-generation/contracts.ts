/**
 * Lead Generation Tool Contracts
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ToolContract } from '../types';

export const CREATE_CUSTOMER_CONTRACT: ToolContract = {
  toolName: 'create_customer',
  description: 'Create a new customer record in the system',
  processId: PROCESS_IDS.LEAD_GENERATION,
  subStepId: 'receive_inquiry',
  
  preconditions: [
    {
      id: 'has_email_or_phone',
      description: 'Customer must have email or phone',
      type: 'custom',
      customCheck: 'args.email || args.phone'
    }
  ],
  
  postconditions: [
    {
      id: 'customer_created',
      description: 'Customer record was created',
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
        select: 'id, email, name, lead_score',
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

export const SCORE_LEAD_CONTRACT: ToolContract = {
  toolName: 'score_lead',
  description: 'Calculate and update lead score for a customer',
  processId: PROCESS_IDS.LEAD_GENERATION,
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
      id: 'lead_scored',
      description: 'Lead score was calculated',
      type: 'field_not_null',
      entity: 'result',
      field: 'lead_score'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'score_persisted',
      description: 'Lead score saved to database',
      table: 'customers',
      query: {
        select: 'id, lead_score',
        where: { id: 'args.customer_id' }
      },
      expect: {
        field: 'lead_score',
        operator: 'not_null'
      }
    }
  ]
};

export const CREATE_REQUEST_CONTRACT: ToolContract = {
  toolName: 'create_request',
  description: 'Create a new service request',
  processId: PROCESS_IDS.LEAD_GENERATION,
  subStepId: 'enter_into_system',
  
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
    },
    {
      id: 'request_status_new',
      description: 'New request has New status',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'New'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'request_in_db',
      description: 'Request exists in database',
      table: 'requests',
      query: {
        select: 'id, status, customer_id',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_request',
  rollbackArgs: { request_id: 'result.id' }
};

export const AUTO_ASSIGN_LEAD_CONTRACT: ToolContract = {
  toolName: 'auto_assign_lead',
  description: 'Automatically assign lead to best available team member',
  processId: PROCESS_IDS.LEAD_GENERATION,
  subStepId: 'assign_lead',
  
  preconditions: [
    {
      id: 'request_exists',
      description: 'Request must exist',
      type: 'entity_exists',
      entity: 'request',
      field: 'id',
      fromArg: 'request_id'
    }
  ],
  
  postconditions: [
    {
      id: 'lead_assigned',
      description: 'Lead was assigned to a team member',
      type: 'field_not_null',
      entity: 'result',
      field: 'assigned_to'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'assignment_in_db',
      description: 'Request has assigned_to set',
      table: 'requests',
      query: {
        select: 'id, assigned_to',
        where: { id: 'args.request_id' }
      },
      expect: {
        field: 'assigned_to',
        operator: 'not_null'
      }
    }
  ]
};

/**
 * All contracts for the Lead Generation process
 */
export const CONTRACTS: ToolContract[] = [
  CREATE_CUSTOMER_CONTRACT,
  SCORE_LEAD_CONTRACT,
  CREATE_REQUEST_CONTRACT,
  AUTO_ASSIGN_LEAD_CONTRACT,
];

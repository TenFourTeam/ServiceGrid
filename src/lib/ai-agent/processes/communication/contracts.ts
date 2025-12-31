/**
 * Customer Communication Tool Contracts
 */

import type { ToolContract } from '../../tool-contracts';
import { PROCESS_IDS } from '../../process-ids';

export const CREATE_CONVERSATION_CONTRACT: ToolContract = {
  toolName: 'create_conversation',
  description: 'Create a new conversation thread with a customer',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_create_conversation',
  
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
      id: 'conversation_created',
      description: 'Conversation was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [
    {
      id: 'customer_unchanged',
      description: 'Customer association must remain',
      type: 'field_equals',
      entity: 'result',
      field: 'customer_id',
      fromArg: 'customer_id'
    }
  ],
  
  dbAssertions: [
    {
      id: 'conversation_in_db',
      description: 'Conversation must exist after creation',
      table: 'conversations',
      query: {
        select: 'id, customer_id, business_id',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_conversation',
  rollbackArgs: { conversation_id: 'result.id' }
};

export const SEND_MESSAGE_CONTRACT: ToolContract = {
  toolName: 'send_message',
  description: 'Send a message within a conversation',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_send_message',
  
  preconditions: [
    {
      id: 'conversation_exists',
      description: 'Conversation must exist',
      type: 'entity_exists',
      entity: 'conversation',
      field: 'id',
      fromArg: 'conversation_id'
    },
    {
      id: 'content_not_empty',
      description: 'Message content must be provided',
      type: 'field_not_null',
      entity: 'args',
      field: 'content'
    }
  ],
  
  postconditions: [
    {
      id: 'message_created',
      description: 'Message was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'message_in_db',
      description: 'Message must exist in conversation',
      table: 'messages',
      query: {
        select: 'id, conversation_id, content',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ]
  // Messages cannot be unsent - no rollback
};

export const SEND_EMAIL_CONTRACT: ToolContract = {
  toolName: 'send_email',
  description: 'Send an email to a customer',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_send_message',
  
  preconditions: [
    {
      id: 'recipient_email_valid',
      description: 'Recipient email must be provided',
      type: 'field_not_null',
      entity: 'args',
      field: 'recipient_email'
    },
    {
      id: 'subject_provided',
      description: 'Subject must be provided',
      type: 'field_not_null',
      entity: 'args',
      field: 'subject'
    }
  ],
  
  postconditions: [
    {
      id: 'email_sent',
      description: 'Email was sent or queued',
      type: 'field_not_null',
      entity: 'result',
      field: 'status'
    }
  ],
  
  invariants: [],
  
  dbAssertions: []
  // Email sending may not create a DB record
};

export const QUEUE_EMAIL_CONTRACT: ToolContract = {
  toolName: 'queue_email',
  description: 'Add an email to the sending queue for scheduled delivery',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_send_notification',
  
  preconditions: [
    {
      id: 'recipient_email_valid',
      description: 'Recipient email must be provided',
      type: 'field_not_null',
      entity: 'args',
      field: 'recipient_email'
    }
  ],
  
  postconditions: [
    {
      id: 'email_queued',
      description: 'Email was added to queue',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'email_in_queue',
      description: 'Email must be in queue with pending status',
      table: 'email_queue',
      query: {
        select: 'id, status, recipient_email',
        where: { id: 'result.id' }
      },
      expect: {
        field: 'status',
        operator: '==',
        value: 'pending'
      }
    }
  ],
  
  rollbackTool: 'cancel_queued_email',
  rollbackArgs: { queue_id: 'result.id' }
};

export const CONTRACTS: ToolContract[] = [
  CREATE_CONVERSATION_CONTRACT,
  SEND_MESSAGE_CONTRACT,
  SEND_EMAIL_CONTRACT,
  QUEUE_EMAIL_CONTRACT
];

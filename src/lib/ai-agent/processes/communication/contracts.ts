/**
 * Customer Communication Tool Contracts
 * 
 * Complete contracts for all communication sub-process tools.
 */

import type { ToolContract } from '../../tool-contracts';
import { PROCESS_IDS } from '../../process-ids';

// =============================================================================
// Sub-Process 1: Receive Customer Inquiry
// =============================================================================

export const CREATE_CONVERSATION_CONTRACT: ToolContract = {
  toolName: 'create_conversation',
  description: 'Create a new conversation thread with a customer',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_receive_inquiry',
  
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
      table: 'sg_conversations',
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

export const GET_OR_CREATE_CONVERSATION_CONTRACT: ToolContract = {
  toolName: 'get_or_create_conversation',
  description: 'Get existing conversation or create new one for customer',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_receive_inquiry',
  
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
      id: 'conversation_available',
      description: 'Conversation is available (existing or new)',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'conversation_linked_to_customer',
      description: 'Conversation must be linked to customer',
      table: 'sg_conversations',
      query: {
        select: 'id, customer_id',
        where: { id: 'result.id', customer_id: 'args.customer_id' }
      },
      expect: {
        count: 1
      }
    }
  ]
};

// =============================================================================
// Sub-Process 2: Access Customer & Service Data
// =============================================================================

export const GET_CONVERSATION_DETAILS_CONTRACT: ToolContract = {
  toolName: 'get_conversation_details',
  description: 'Get conversation with all linked context (customer, job, worker)',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_access_data',
  
  preconditions: [
    {
      id: 'conversation_exists',
      description: 'Conversation must exist',
      type: 'entity_exists',
      entity: 'conversation',
      field: 'id',
      fromArg: 'conversation_id'
    }
  ],
  
  postconditions: [
    {
      id: 'data_retrieved',
      description: 'Conversation data was retrieved',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  dbAssertions: []
};

// =============================================================================
// Sub-Process 3: Communicate Service Details
// =============================================================================

export const SEND_MESSAGE_CONTRACT: ToolContract = {
  toolName: 'send_message',
  description: 'Send a message within a conversation',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_send_details',
  
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
      table: 'sg_messages',
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
  subStepId: 'comm_send_details',
  
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
  // Email sending may not create a DB record directly
};

// =============================================================================
// Sub-Process 4: Real-Time Service Updates
// =============================================================================

export const SEND_STATUS_UPDATE_CONTRACT: ToolContract = {
  toolName: 'send_status_update',
  description: 'Send job status update notification to customer',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_realtime_updates',
  
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
      id: 'status_provided',
      description: 'New status must be provided',
      type: 'field_not_null',
      entity: 'args',
      field: 'status'
    }
  ],
  
  postconditions: [
    {
      id: 'notification_sent',
      description: 'Status notification was sent',
      type: 'field_not_null',
      entity: 'result',
      field: 'message_id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'message_logged',
      description: 'Status update message must be logged',
      table: 'sg_messages',
      query: {
        select: 'id, conversation_id',
        where: { id: 'result.message_id' }
      },
      expect: {
        count: 1
      }
    }
  ]
};

// =============================================================================
// Sub-Process 5: Follow-Up Post-Service
// =============================================================================

export const QUEUE_EMAIL_CONTRACT: ToolContract = {
  toolName: 'queue_email',
  description: 'Add an email to the sending queue for scheduled delivery',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_followup',
  
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

export const QUEUE_FOLLOWUP_EMAIL_CONTRACT: ToolContract = {
  toolName: 'queue_followup_email',
  description: 'Queue a post-service follow-up email',
  processId: PROCESS_IDS.COMMUNICATION,
  subStepId: 'comm_followup',
  
  preconditions: [
    {
      id: 'job_completed',
      description: 'Job must be completed',
      type: 'field_equals',
      entity: 'job',
      field: 'status',
      value: 'completed'
    },
    {
      id: 'customer_has_email',
      description: 'Customer must have email',
      type: 'field_not_null',
      entity: 'customer',
      field: 'email'
    }
  ],
  
  postconditions: [
    {
      id: 'followup_queued',
      description: 'Follow-up email was queued',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'followup_in_queue',
      description: 'Follow-up email must be in queue',
      table: 'email_queue',
      query: {
        select: 'id, email_type, status',
        where: { id: 'result.id', email_type: 'job_followup' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'cancel_queued_email',
  rollbackArgs: { queue_id: 'result.id' }
};

// =============================================================================
// Export all contracts
// =============================================================================

export const CONTRACTS: ToolContract[] = [
  CREATE_CONVERSATION_CONTRACT,
  GET_OR_CREATE_CONVERSATION_CONTRACT,
  GET_CONVERSATION_DETAILS_CONTRACT,
  SEND_MESSAGE_CONTRACT,
  SEND_EMAIL_CONTRACT,
  SEND_STATUS_UPDATE_CONTRACT,
  QUEUE_EMAIL_CONTRACT,
  QUEUE_FOLLOWUP_EMAIL_CONTRACT
];

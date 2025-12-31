/**
 * Customer Communication Process Definition
 * 
 * SIPOC-structured definition for customer communications.
 * Covers email, SMS, in-app messages, and notifications.
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ProcessDefinition } from '../types';

export const DEFINITION: ProcessDefinition = {
  id: PROCESS_IDS.COMMUNICATION,
  name: 'Customer Communication',
  description: 'Manage all customer communications including emails, messages, and notifications',
  phase: 'pre_service',
  position: 2,
  order: 2,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: ['Customer', 'Business Team', 'Automation System', 'External Events'],
    inputs: ['Customer contact info', 'Message content', 'Communication templates', 'Trigger events'],
    processSteps: [
      'Identify communication trigger',
      'Select/compose message',
      'Personalize content',
      'Send via appropriate channel',
      'Track delivery and engagement'
    ],
    outputs: ['Sent messages', 'Delivery confirmations', 'Engagement metrics', 'Conversation threads'],
    customers: ['Customer', 'Business Owner', 'Team Members']
  },
  
  subSteps: [
    {
      id: 'comm_create_conversation',
      name: 'Create Conversation',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'User or System',
        input: 'Customer ID, initial context',
        process: 'Create conversation thread for customer',
        output: 'New conversation record',
        customer: 'Team Member'
      },
      tools: ['create_conversation'],
      dbEntities: ['conversations'],
      automationCapabilities: ['Auto-create on first contact', 'Link to job/request']
    },
    {
      id: 'comm_send_message',
      name: 'Send Message',
      order: 2,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Team Member or System',
        input: 'Conversation ID, message content, channel',
        process: 'Send message to customer via selected channel',
        output: 'Sent message record',
        customer: 'Customer'
      },
      tools: ['send_message', 'send_email'],
      dbEntities: ['messages', 'mail_sends'],
      automationCapabilities: ['Template-based sending', 'Scheduled delivery']
    },
    {
      id: 'comm_send_notification',
      name: 'Send Notification',
      order: 3,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Event Trigger',
        input: 'Event type, recipient, notification template',
        process: 'Send automated notification based on event',
        output: 'Notification delivery status',
        customer: 'Customer or Team Member'
      },
      tools: ['send_notification', 'queue_email'],
      dbEntities: ['email_queue', 'messages'],
      automationCapabilities: ['Event-driven notifications', 'Batched delivery']
    },
    {
      id: 'comm_track_engagement',
      name: 'Track Engagement',
      order: 4,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Email/Message Platform',
        input: 'Delivery events, open events, click events',
        process: 'Track and record engagement metrics',
        output: 'Engagement analytics',
        customer: 'Business Owner'
      },
      tools: ['get_conversation_activity'],
      dbEntities: ['messages', 'mail_sends'],
      automationCapabilities: ['Real-time tracking', 'Engagement scoring']
    }
  ],
  
  tools: [
    'create_conversation',
    'send_message',
    'send_email',
    'send_notification',
    'queue_email',
    'get_conversation_activity',
    'list_conversations'
  ],
  
  inputContract: {
    customerId: 'string (required) - Target customer ID',
    channel: 'string (optional) - email, sms, in_app',
    content: 'string (required) - Message content',
    templateId: 'string (optional) - Template to use'
  },
  
  outputContract: {
    messageId: 'string - Unique message identifier',
    conversationId: 'string - Conversation thread ID',
    deliveryStatus: 'string - sent, delivered, failed',
    timestamp: 'string - ISO timestamp of send'
  },
  
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' },
    { type: 'context_check', field: 'hasContactInfo', operator: '==', value: true }
  ],
  
  exitConditions: [
    { type: 'status_equals', entity: 'message', field: 'status', value: 'sent' }
  ],
  
  userCheckpoints: [
    'Review message before sending',
    'Approve automated template changes'
  ],
  
  nextProcesses: [PROCESS_IDS.SITE_ASSESSMENT, PROCESS_IDS.QUOTING, PROCESS_IDS.SCHEDULING],
  previousProcesses: [PROCESS_IDS.LEAD_GENERATION]
};

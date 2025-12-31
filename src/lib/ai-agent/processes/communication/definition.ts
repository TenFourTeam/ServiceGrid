/**
 * Customer Communication Process Definition
 * 
 * Full SIPOC-structured definition for the 5 sub-processes of customer communication.
 * Adapted for ServiceGrid with DIY/DWY/DFY automation modes.
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ProcessDefinition } from '../types';

export const DEFINITION: ProcessDefinition = {
  id: PROCESS_IDS.COMMUNICATION,
  name: 'Customer Communication',
  description: 'Full workflow for managing customer communications across all channels and lifecycle stages',
  phase: 'pre_service',
  position: 2,
  order: 2,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Customer (initiator via portal/phone/email)',
      'Office Staff (information source)',
      'Field Technician (status updates)',
      'CRM System (customer history)',
      'Job Status System (service updates)'
    ],
    inputs: [
      'Customer inquiry (phone, email, portal)',
      'Service request details',
      'Technician availability',
      'Customer history data',
      'Job status updates'
    ],
    processSteps: [
      'Receive customer inquiry',
      'Access customer and service data',
      'Communicate service details/confirm appointment',
      'Provide real-time updates during service',
      'Follow-up post-service'
    ],
    outputs: [
      'Logged customer inquiry',
      'Consolidated customer profile',
      'Service confirmation sent',
      'Real-time status notifications',
      'Post-service follow-up communication'
    ],
    customers: [
      'Customer (receives communications)',
      'Office Staff (for scheduling/follow-up)',
      'Field Technician (for awareness)'
    ]
  },
  
  subSteps: [
    // Sub-Process 1: Receive Customer Inquiry
    {
      id: 'comm_receive_inquiry',
      name: 'Receive Customer Inquiry',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Customer (via portal, phone, email) or Team Member',
        input: 'Customer inquiry via chosen channel',
        process: 'Receive inquiry → Create/find conversation → Log contact details → Queue for processing',
        output: 'Logged customer inquiry with conversation thread',
        customer: 'Customer Service Representative / Team Member'
      },
      tools: ['create_conversation', 'get_or_create_conversation', 'search_customers'],
      dbEntities: ['sg_conversations', 'sg_messages', 'customers'],
      automationCapabilities: [
        'Auto-create conversation on customer portal submission',
        'Auto-create conversation on first quote/job for customer',
        'Link conversation to job/customer context'
      ]
    },
    
    // Sub-Process 2: Access Customer and Service Data
    {
      id: 'comm_access_data',
      name: 'Access Customer & Service Data',
      order: 2,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'CRM System (sg_conversations with linked data)',
        input: 'Customer identifier or conversation ID',
        process: 'Query customer profile → Fetch job context → Retrieve service history → Validate data completeness',
        output: 'Consolidated customer and service data profile',
        customer: 'Communication initiator (Team Member or AI Agent)'
      },
      tools: ['get_customer', 'get_job', 'list_conversations', 'get_conversation_details'],
      dbEntities: ['sg_conversations', 'customers', 'jobs', 'profiles', 'quotes'],
      automationCapabilities: [
        'Auto-fetch all linked entities on conversation load',
        'Real-time data consolidation via RPC',
        'Context enrichment for AI Agent'
      ]
    },
    
    // Sub-Process 3: Communicate Service Details / Confirm Appointment
    {
      id: 'comm_send_details',
      name: 'Communicate Service Details',
      order: 3,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Service Scheduler System / Team Member / AI Agent',
        input: 'Confirmed service appointment details, customer contact preferences',
        process: 'Retrieve preferences → Generate personalized message → Send via preferred channel → Log confirmation status',
        output: 'Sent service confirmation via message and/or email',
        customer: 'Customer (receives confirmation)'
      },
      tools: ['send_message', 'send_email', 'queue_email'],
      dbEntities: ['sg_messages', 'mail_sends', 'email_queue'],
      automationCapabilities: [
        'Auto-send confirmation when job scheduled',
        'Auto-send quote notification when quote created',
        'Template-based personalized messaging'
      ]
    },
    
    // Sub-Process 4: Provide Real-Time Updates During Service
    {
      id: 'comm_realtime_updates',
      name: 'Real-Time Service Updates',
      order: 4,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Field Technician / Job Status System',
        input: 'Job status change event (en_route, in_progress, completed)',
        process: 'Detect status change → Compose status message → Auto-insert to conversation → Notify customer',
        output: 'Real-time status notification delivered to customer',
        customer: 'Customer (tracking service progress)'
      },
      tools: ['send_message', 'update_job'],
      dbEntities: ['sg_messages', 'sg_conversations', 'jobs'],
      automationCapabilities: [
        'Auto-message customer on job status change',
        'Real-time push via Supabase Realtime',
        'Predefined status message templates'
      ]
    },
    
    // Sub-Process 5: Follow-Up Post-Service
    {
      id: 'comm_followup',
      name: 'Follow-Up Post-Service',
      order: 5,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Job Completion Event / Email Queue System',
        input: 'Completed job record, customer preferences',
        process: 'Detect job completion → Wait configured delay → Queue follow-up email → Process via cron',
        output: 'Follow-up email sent and logged',
        customer: 'Customer (receiving follow-up)'
      },
      tools: ['queue_email', 'send_email'],
      dbEntities: ['email_queue', 'mail_sends', 'jobs'],
      automationCapabilities: [
        'Auto-queue follow-up email after job completion',
        'Configurable delay (default 24h)',
        'Feedback request integration'
      ]
    }
  ],
  
  tools: [
    'create_conversation',
    'get_or_create_conversation',
    'search_customers',
    'get_customer',
    'get_job',
    'list_conversations',
    'get_conversation_details',
    'send_message',
    'send_email',
    'queue_email',
    'update_job'
  ],
  
  inputContract: {
    customerId: 'string (required) - Target customer ID',
    conversationId: 'string (optional) - Existing conversation ID',
    channel: 'string (optional) - email, portal, in_app',
    content: 'string (required for sending) - Message content',
    templateId: 'string (optional) - Template to use for automated messages'
  },
  
  outputContract: {
    conversationId: 'string - Conversation thread ID',
    messageId: 'string - Unique message identifier (if message sent)',
    deliveryStatus: 'string - created, sent, delivered, queued, failed',
    timestamp: 'string - ISO timestamp of action'
  },
  
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' },
    { type: 'context_check', field: 'hasContactInfo', operator: '==', value: true }
  ],
  
  exitConditions: [
    { type: 'entity_exists', entity: 'conversation', field: 'id' },
    { type: 'status_equals', entity: 'message', field: 'status', value: 'sent' }
  ],
  
  userCheckpoints: [
    'Review message content before sending (DWY mode)',
    'Approve automated template changes',
    'Confirm follow-up timing configuration'
  ],
  
  nextProcesses: [PROCESS_IDS.SITE_ASSESSMENT, PROCESS_IDS.QUOTING, PROCESS_IDS.SCHEDULING],
  previousProcesses: [PROCESS_IDS.LEAD_GENERATION]
};

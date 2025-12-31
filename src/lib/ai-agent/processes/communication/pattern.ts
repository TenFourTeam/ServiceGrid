/**
 * Customer Communication Multi-Step Pattern
 */

import type { MultiStepPattern } from '../types';

export const PATTERN: MultiStepPattern = {
  id: 'complete_customer_communication',
  name: 'Complete Customer Communication',
  description: 'Full workflow for initiating and managing customer communications',
  category: 'pre-service',
  
  steps: [
    {
      order: 1,
      tool: 'get_customer',
      description: 'Retrieve customer details and contact information',
      inputMapping: {
        customerId: 'context.customerId'
      },
      outputKey: 'customer',
      optional: false,
      retryOnFail: true
    },
    {
      order: 2,
      tool: 'get_or_create_conversation',
      description: 'Get existing conversation or create new one',
      inputMapping: {
        customerId: 'context.customerId',
        businessId: 'context.businessId'
      },
      outputKey: 'conversation',
      optional: false,
      retryOnFail: true
    },
    {
      order: 3,
      tool: 'send_message',
      description: 'Send the message in the conversation',
      inputMapping: {
        conversationId: 'results.conversation.id',
        content: 'context.messageContent',
        senderId: 'context.userId'
      },
      outputKey: 'message',
      optional: false,
      retryOnFail: true
    },
    {
      order: 4,
      tool: 'send_email',
      description: 'Also send as email if requested',
      inputMapping: {
        recipientEmail: 'results.customer.email',
        subject: 'context.emailSubject',
        body: 'context.messageContent',
        businessId: 'context.businessId'
      },
      outputKey: 'email',
      optional: true,
      skipIf: 'context.skipEmail === true'
    }
  ],
  
  preconditions: [
    'Customer must exist and have valid contact info',
    'User must have permission to communicate',
    'Business must have email sending configured'
  ],
  
  postconditions: [
    'Message is stored in conversation history',
    'Customer receives communication via selected channel',
    'Activity is logged for audit'
  ],
  
  successMetrics: [
    'Message delivered successfully',
    'No duplicate messages sent',
    'Response time under 2 seconds'
  ],
  
  estimatedDurationMs: 5000
};

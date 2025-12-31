/**
 * Customer Communication Database Triggers
 * 
 * Triggers for DFY automation of communication sub-processes.
 */

import type { ProcessTriggers } from '../types';

export const TRIGGERS: ProcessTriggers = {
  triggers: [
    'set_updated_at_messages',
    'trg_update_messages_updated_at',
    'set_mail_sends_updated_at',
    
    // Sub-Process 1: Receive Customer Inquiry (DFY)
    // Auto-create conversation when service request submitted
    'trg_auto_create_conversation_on_request',
    
    // Sub-Process 4: Real-Time Service Updates (DFY)
    // Auto-message customer when job status changes
    'trg_job_status_customer_notification',
    
    // Sub-Process 5: Follow-Up Post-Service (DFY)
    // Auto-queue follow-up email after job completion
    'trg_job_complete_followup_queue'
  ],
  functions: [
    'set_updated_at',
    'fn_auto_create_conversation_on_request',
    'fn_job_status_customer_notification',
    'fn_queue_job_followup_email'
  ]
};

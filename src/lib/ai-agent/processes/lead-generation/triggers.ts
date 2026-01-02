/**
 * Lead Generation Database Triggers
 */

import type { ProcessTriggers } from '../types';

export const TRIGGERS: ProcessTriggers = {
  triggers: [
    'trg_auto_score_lead',
    'trg_auto_assign_request', 
    'trg_queue_welcome_email'
  ],
  functions: [
    'fn_auto_score_lead',
    'fn_auto_assign_request',
    'fn_queue_welcome_email'
  ]
};

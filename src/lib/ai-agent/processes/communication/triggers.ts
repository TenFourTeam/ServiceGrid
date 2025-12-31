/**
 * Customer Communication Database Triggers
 */

import type { ProcessTriggers } from '../types';

export const TRIGGERS: ProcessTriggers = {
  triggers: [
    'set_updated_at_messages',
    'trg_update_messages_updated_at',
    'set_mail_sends_updated_at'
  ],
  functions: [
    'set_updated_at'
  ]
};

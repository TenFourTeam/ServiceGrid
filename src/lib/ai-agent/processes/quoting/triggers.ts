/**
 * Quoting Database Triggers
 */

import type { ProcessTriggers } from '../types';

export const TRIGGERS: ProcessTriggers = {
  triggers: [
    'trg_quote_number_sequence',
    'trg_quote_total_update',
    'trg_quote_approved_notify'
  ],
  functions: [
    'fn_generate_quote_number',
    'fn_recalculate_quote_total',
    'fn_notify_quote_approved'
  ]
};

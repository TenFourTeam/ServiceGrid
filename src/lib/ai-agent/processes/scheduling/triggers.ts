/**
 * Scheduling Database Triggers
 */

import type { ProcessTriggers } from '../types';

export const TRIGGERS: ProcessTriggers = {
  triggers: [
    'trg_job_scheduled_notify',
    'trg_job_conflict_check',
    'trg_job_reminder_queue'
  ],
  functions: [
    'fn_notify_job_scheduled',
    'fn_check_scheduling_conflicts',
    'fn_queue_job_reminder'
  ]
};

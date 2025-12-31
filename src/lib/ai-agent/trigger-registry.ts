/**
 * Trigger Registry - Maps processes to their database triggers
 * 
 * This registry tracks which database triggers are expected for each process,
 * enabling the validator to verify automation layer completeness.
 */

export interface ProcessTriggers {
  triggers: string[];
  functions: string[];
}

/**
 * Registry of known database triggers and functions for each process
 * Update this when adding new automation
 */
export const PROCESS_TRIGGER_REGISTRY: Record<string, ProcessTriggers> = {
  'lead_generation': {
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
  },
  'site_assessment': {
    triggers: [
      'trg_assessment_job_created',
      'trg_assessment_photo_uploaded',
      'trg_assessment_completed'
    ],
    functions: [
      'fn_create_assessment_checklist',
      'fn_tag_assessment_photo',
      'fn_complete_assessment'
    ]
  },
  // Other processes - add triggers as they are created
  'communication': { triggers: [], functions: [] },
  'quoting': { triggers: [], functions: [] },
  'scheduling': { triggers: [], functions: [] },
  'dispatch': { triggers: [], functions: [] },
  'quality_assurance': { triggers: [], functions: [] },
  'maintenance': { triggers: [], functions: [] },
  'invoicing': { triggers: [], functions: [] },
  'payment_collection': { triggers: [], functions: [] },
  'review_management': { triggers: [], functions: [] },
  'warranty': { triggers: [], functions: [] },
  'inventory': { triggers: [], functions: [] },
  'analytics': { triggers: [], functions: [] },
  'seasonal_planning': { triggers: [], functions: [] },
};

/**
 * Get triggers for a process
 */
export function getProcessTriggers(processId: string): ProcessTriggers {
  return PROCESS_TRIGGER_REGISTRY[processId] || { triggers: [], functions: [] };
}

/**
 * Check if a process has database triggers defined
 */
export function hasDatabaseTriggers(processId: string): boolean {
  const config = getProcessTriggers(processId);
  return config.triggers.length > 0;
}

/**
 * Check if a process has database functions defined
 */
export function hasDatabaseFunctions(processId: string): boolean {
  const config = getProcessTriggers(processId);
  return config.functions.length > 0;
}

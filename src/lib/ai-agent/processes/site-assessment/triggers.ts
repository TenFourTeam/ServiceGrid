/**
 * Site Assessment Database Triggers
 */

import type { ProcessTriggers } from '../types';

export const TRIGGERS: ProcessTriggers = {
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
};

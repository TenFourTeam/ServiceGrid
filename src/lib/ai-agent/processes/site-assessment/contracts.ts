/**
 * Site Assessment Tool Contracts
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ToolContract } from '../types';

export const CREATE_ASSESSMENT_JOB_CONTRACT: ToolContract = {
  toolName: 'create_assessment_job',
  description: 'Create an assessment job with is_assessment flag',
  processId: PROCESS_IDS.SITE_ASSESSMENT,
  subStepId: 'schedule_assessment',
  
  preconditions: [
    {
      id: 'customer_exists',
      description: 'Customer must exist',
      type: 'entity_exists',
      entity: 'customer',
      field: 'id',
      fromArg: 'customer_id'
    },
    {
      id: 'has_address',
      description: 'Address is required for assessment',
      type: 'field_not_null',
      entity: 'args',
      field: 'address'
    }
  ],
  
  postconditions: [
    {
      id: 'job_created',
      description: 'Assessment job was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    },
    {
      id: 'job_is_assessment',
      description: 'Job has is_assessment flag set',
      type: 'field_equals',
      entity: 'result',
      field: 'is_assessment',
      value: true
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'assessment_job_in_db',
      description: 'Assessment job exists in database',
      table: 'jobs',
      query: {
        select: 'id, is_assessment, customer_id, status',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_job',
  rollbackArgs: { job_id: 'result.id' }
};

export const UPLOAD_JOB_PHOTO_CONTRACT: ToolContract = {
  toolName: 'upload_job_photo',
  description: 'Upload a photo for a job',
  processId: PROCESS_IDS.SITE_ASSESSMENT,
  subStepId: 'capture_photos',
  
  preconditions: [
    {
      id: 'job_exists',
      description: 'Job must exist',
      type: 'entity_exists',
      entity: 'job',
      field: 'id',
      fromArg: 'job_id'
    }
  ],
  
  postconditions: [
    {
      id: 'media_created',
      description: 'Media record was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'media_in_db',
      description: 'Media record exists in database',
      table: 'media',
      query: {
        select: 'id, job_id, tags',
        where: { id: 'result.id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'delete_media',
  rollbackArgs: { media_id: 'result.id' }
};

export const ADD_MEDIA_TAGS_CONTRACT: ToolContract = {
  toolName: 'add_media_tags',
  description: 'Add tags to media for categorization',
  processId: PROCESS_IDS.SITE_ASSESSMENT,
  subStepId: 'analyze_issues',
  
  preconditions: [
    {
      id: 'media_exists',
      description: 'Media must exist',
      type: 'entity_exists',
      entity: 'media',
      field: 'id',
      fromArg: 'media_id'
    }
  ],
  
  postconditions: [
    {
      id: 'tags_added',
      description: 'Tags were added to media',
      type: 'field_not_null',
      entity: 'result',
      field: 'tags'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'tags_in_db',
      description: 'Tags persisted in database',
      table: 'media',
      query: {
        select: 'id, tags',
        where: { id: 'args.media_id' }
      },
      expect: {
        field: 'tags',
        operator: 'not_null'
      }
    }
  ],
  
  rollbackTool: 'remove_media_tags',
  rollbackArgs: { media_id: 'args.media_id', tags: 'args.tags' }
};

export const GENERATE_ASSESSMENT_REPORT_CONTRACT: ToolContract = {
  toolName: 'generate_assessment_report',
  description: 'Generate assessment report from job data',
  processId: PROCESS_IDS.SITE_ASSESSMENT,
  subStepId: 'generate_report',
  
  preconditions: [
    {
      id: 'job_exists',
      description: 'Job must exist',
      type: 'entity_exists',
      entity: 'job',
      field: 'id',
      fromArg: 'job_id'
    },
    {
      id: 'job_is_assessment',
      description: 'Job must be an assessment',
      type: 'field_equals',
      entity: 'job',
      field: 'is_assessment',
      value: true
    }
  ],
  
  postconditions: [
    {
      id: 'report_generated',
      description: 'Report was generated',
      type: 'entity_exists',
      entity: 'result',
      field: 'report_url'
    }
  ],
  
  invariants: [],
  
  dbAssertions: []
};

/**
 * All contracts for the Site Assessment process
 */
export const CONTRACTS: ToolContract[] = [
  CREATE_ASSESSMENT_JOB_CONTRACT,
  UPLOAD_JOB_PHOTO_CONTRACT,
  ADD_MEDIA_TAGS_CONTRACT,
  GENERATE_ASSESSMENT_REPORT_CONTRACT,
];

/**
 * Scheduling Tool Contracts
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ToolContract } from '../types';

export const CREATE_JOB_CONTRACT: ToolContract = {
  toolName: 'create_job',
  description: 'Create a new job/work order',
  processId: PROCESS_IDS.SCHEDULING,
  subStepId: 'create_job',
  
  preconditions: [
    {
      id: 'customer_exists',
      description: 'Customer must exist',
      type: 'entity_exists',
      entity: 'customer',
      field: 'id',
      fromArg: 'customer_id'
    }
  ],
  
  postconditions: [
    {
      id: 'job_created',
      description: 'Job was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    },
    {
      id: 'job_status_pending',
      description: 'New job status is Pending',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Pending'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'job_in_db',
      description: 'Job exists in database',
      table: 'jobs',
      query: {
        select: 'id, status, customer_id',
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

export const SCHEDULE_JOB_CONTRACT: ToolContract = {
  toolName: 'schedule_job',
  description: 'Schedule a job for a specific date/time',
  processId: PROCESS_IDS.SCHEDULING,
  subStepId: 'create_job',
  
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
      id: 'job_not_completed',
      description: 'Job must not be completed',
      type: 'custom',
      customCheck: 'job.status !== "Completed"'
    }
  ],
  
  postconditions: [
    {
      id: 'job_has_time',
      description: 'Job has starts_at set',
      type: 'field_not_null',
      entity: 'result',
      field: 'starts_at'
    },
    {
      id: 'job_status_scheduled',
      description: 'Job status is Scheduled',
      type: 'field_equals',
      entity: 'result',
      field: 'status',
      value: 'Scheduled'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'job_scheduled_in_db',
      description: 'Job is scheduled in database',
      table: 'jobs',
      query: {
        select: 'id, status, starts_at',
        where: { id: 'args.job_id' }
      },
      expect: {
        field: 'starts_at',
        operator: 'not_null'
      }
    }
  ]
};

export const ASSIGN_JOB_CONTRACT: ToolContract = {
  toolName: 'assign_job',
  description: 'Assign a team member to a job',
  processId: PROCESS_IDS.SCHEDULING,
  subStepId: 'create_job',
  
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
      id: 'team_member_exists',
      description: 'Team member must exist',
      type: 'entity_exists',
      entity: 'team_member',
      field: 'id',
      fromArg: 'user_id'
    }
  ],
  
  postconditions: [
    {
      id: 'assignment_created',
      description: 'Job assignment was created',
      type: 'entity_exists',
      entity: 'result',
      field: 'id'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'assignment_in_db',
      description: 'Job assignment exists in database',
      table: 'job_assignments',
      query: {
        select: 'id, job_id, user_id',
        where: { job_id: 'args.job_id', user_id: 'args.user_id' }
      },
      expect: {
        count: 1
      }
    }
  ],
  
  rollbackTool: 'unassign_job',
  rollbackArgs: { job_id: 'args.job_id', user_id: 'args.user_id' }
};

export const SEND_JOB_CONFIRMATION_CONTRACT: ToolContract = {
  toolName: 'send_job_confirmation',
  description: 'Send job confirmation to customer',
  processId: PROCESS_IDS.SCHEDULING,
  subStepId: 'send_confirmation',
  
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
      id: 'job_scheduled',
      description: 'Job must be scheduled',
      type: 'field_not_null',
      entity: 'job',
      field: 'starts_at'
    },
    {
      id: 'customer_has_email',
      description: 'Customer must have email',
      type: 'field_not_null',
      entity: 'customer',
      field: 'email'
    }
  ],
  
  postconditions: [
    {
      id: 'email_sent',
      description: 'Confirmation email was sent',
      type: 'entity_exists',
      entity: 'result',
      field: 'success'
    }
  ],
  
  invariants: [],
  
  dbAssertions: [
    {
      id: 'mail_logged',
      description: 'Email was logged',
      table: 'mail_sends',
      query: {
        select: 'id, job_id',
        where: { job_id: 'args.job_id' }
      },
      expect: {
        count: 1
      }
    }
  ]
};

/**
 * All contracts for the Scheduling process
 */
export const CONTRACTS: ToolContract[] = [
  CREATE_JOB_CONTRACT,
  SCHEDULE_JOB_CONTRACT,
  ASSIGN_JOB_CONTRACT,
  SEND_JOB_CONFIRMATION_CONTRACT,
];

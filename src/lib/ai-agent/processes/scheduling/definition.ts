/**
 * Scheduling Process Definition
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ProcessDefinition } from '../types';

export const DEFINITION: ProcessDefinition = {
  id: PROCESS_IDS.SCHEDULING,
  name: 'Scheduling',
  description: 'Schedule jobs and appointments based on customer preferences, team availability, and route optimization',
  phase: 'pre_service',
  position: 5,
  order: 5,
  depth: 0,
  currentState: 'DWY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Approved Quotes',
      'Customer Requests',
      'Team Calendar',
      'Route Optimizer'
    ],
    inputs: [
      'Quote/Request Details',
      'Customer Preferences (days, times)',
      'Team Availability',
      'Job Duration Estimates',
      'Geographic Location'
    ],
    processSteps: [
      '1. Check Quote/Request Status',
      '2. Review Customer Preferences',
      '3. Check Team Availability',
      '4. Optimize Route/Schedule',
      '5. Create Job/Appointment',
      '6. Send Confirmation'
    ],
    outputs: [
      'Scheduled Job Record',
      'Team Member Assignment',
      'Customer Confirmation',
      'Calendar Entry'
    ],
    customers: [
      'Customer (receives confirmation)',
      'Field Team (assigned work)',
      'Dispatch (manages schedule)'
    ]
  },

  subSteps: [
    {
      id: 'check_status',
      name: 'Check Quote/Request Status',
      order: 1,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Quoting/Lead Generation Process',
        input: 'Approved quote or qualified request',
        process: 'Verify quote is approved or request is qualified. Check for any pending customer decisions. Validate all required information is present.',
        output: 'Validated quote/request ready for scheduling',
        customer: 'Preference Review (next step)'
      },
      tools: ['get_quote', 'get_request', 'get_customer'],
      dbEntities: ['quotes', 'requests', 'customers'],
      automationCapabilities: [
        'Auto-trigger scheduling on quote approval',
        'Validate completeness automatically',
        'Flag missing information'
      ]
    },
    {
      id: 'review_preferences',
      name: 'Review Customer Preferences',
      order: 2,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Customer Records',
        input: 'Customer scheduling preferences and history',
        process: 'Load customer preferred days and time windows. Check avoid days (holidays, etc). Review past scheduling patterns. Note any special requirements.',
        output: 'Customer preference constraints',
        customer: 'Availability Check (next step)'
      },
      tools: ['get_customer', 'list_customer_jobs'],
      dbEntities: ['customers', 'jobs'],
      automationCapabilities: [
        'Auto-load preferences from customer record',
        'Learn from past scheduling patterns',
        'Suggest optimal times based on history'
      ]
    },
    {
      id: 'check_availability',
      name: 'Check Team Availability',
      order: 3,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Team Calendar / Constraints',
        input: 'Customer preferences and job requirements',
        process: 'Query team member calendars. Check for existing appointments. Verify skill match for job type. Consider travel time between jobs.',
        output: 'Available time slots with team options',
        customer: 'Route Optimization (next step)'
      },
      tools: ['check_team_availability', 'list_team_members', 'get_team_calendar'],
      dbEntities: ['profiles', 'jobs', 'business_constraints'],
      automationCapabilities: [
        'Real-time calendar integration',
        'Skill-based matching',
        'Buffer time calculation'
      ]
    },
    {
      id: 'optimize_route',
      name: 'Optimize Route/Schedule',
      order: 4,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Route Optimizer / AI',
        input: 'Available slots with locations',
        process: 'Calculate travel times between jobs. Optimize route efficiency. Balance team workloads. Select best slot considering all factors.',
        output: 'Optimized schedule slot recommendation',
        customer: 'Job Creation (next step)'
      },
      tools: ['suggest_reschedule', 'calculate_route'],
      dbEntities: ['jobs', 'customers'],
      automationCapabilities: [
        'AI-powered route optimization',
        'Minimize travel time',
        'Balance workload across team'
      ]
    },
    {
      id: 'create_job',
      name: 'Create Job/Appointment',
      order: 5,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Schedule Optimizer',
        input: 'Selected time slot and job details',
        process: 'Create job record with scheduled time. Link to quote/request. Assign team member. Set job status to Scheduled. Create checklist if applicable.',
        output: 'Scheduled job with assignment',
        customer: 'Confirmation Sending (next step)'
      },
      tools: ['create_job', 'schedule_job', 'assign_job', 'create_checklist'],
      dbEntities: ['jobs', 'job_assignments', 'checklists'],
      automationCapabilities: [
        'Auto-create job from approved quote',
        'Auto-assign based on availability',
        'Auto-create job checklist'
      ]
    },
    {
      id: 'send_confirmation',
      name: 'Send Confirmation',
      order: 6,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Scheduling System',
        input: 'Scheduled job details',
        process: 'Generate confirmation message. Include date, time, and assigned technician. Send via email/SMS. Offer calendar add option. Set reminder for day before.',
        output: 'Confirmation sent to customer',
        customer: 'Customer (receives confirmation)'
      },
      tools: ['send_job_confirmation', 'send_email', 'update_job'],
      dbEntities: ['jobs', 'mail_sends', 'email_queue'],
      automationCapabilities: [
        'Auto-send on job creation',
        'Include calendar attachment',
        'Schedule reminder emails'
      ]
    }
  ],

  tools: [
    'get_quote',
    'get_request',
    'get_customer',
    'list_customer_jobs',
    'check_team_availability',
    'list_team_members',
    'get_team_calendar',
    'suggest_reschedule',
    'create_job',
    'schedule_job',
    'assign_job',
    'create_checklist',
    'send_job_confirmation',
    'send_email',
    'update_job'
  ],
  
  inputContract: {
    customer_id: 'uuid',
    quote_id: 'uuid?',
    request_id: 'uuid?',
    preferred_date: 'date?',
    preferred_time: 'string?',
    assigned_to: 'uuid?',
    duration_minutes: 'number?'
  },
  
  outputContract: {
    job_id: 'uuid',
    starts_at: 'timestamp',
    ends_at: 'timestamp',
    assigned_to: 'uuid',
    status: 'string',
    confirmation_sent: 'boolean'
  },
  
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  
  exitConditions: [
    { type: 'entity_exists', entity: 'job', field: 'id' },
    { type: 'status_equals', entity: 'job', field: 'status', operator: '==', value: 'Scheduled' }
  ],
  
  userCheckpoints: ['time_slot_approval', 'team_member_selection'],
  
  nextProcesses: [PROCESS_IDS.DISPATCH],
  previousProcesses: [PROCESS_IDS.QUOTING, PROCESS_IDS.SITE_ASSESSMENT]
};

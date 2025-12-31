/**
 * Site Assessment Process Definition
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ProcessDefinition } from '../types';

export const DEFINITION: ProcessDefinition = {
  id: PROCESS_IDS.SITE_ASSESSMENT,
  name: 'Site Assessment',
  description: 'On-site evaluation to capture property details, photos, and generate accurate quotes',
  phase: 'pre_service',
  position: 3,
  order: 3,
  depth: 0,
  currentState: 'DFY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Customer (property access)',
      'Sales Team (assessment request)',
      'Previous Process (lead generation)',
      'Scheduling System'
    ],
    inputs: [
      'Customer Information',
      'Property Address',
      'Service Interest Details',
      'Access Instructions',
      'Preferred Assessment Date/Time'
    ],
    processSteps: [
      '1. Log Assessment Request',
      '2. Schedule Assessment & Assign Assessor',
      '3. Conduct Site Inspection (Checklist-Driven)',
      '4. Capture Before Photos & Documentation',
      '5. Analyze & Flag Issues (AI-Assisted Risk Tagging)',
      '6. Generate Assessment Report'
    ],
    outputs: [
      'Complete Site Assessment Record',
      'Before Photos with Tags',
      'Property Measurements',
      'Issue/Risk Flags',
      'Assessment Report for Quoting'
    ],
    customers: [
      'Quoting/Estimating Team',
      'Customer (receives assessment summary)',
      'Field Crews (job preparation)'
    ]
  },

  subSteps: [
    {
      id: 'log_assessment_request',
      name: 'Log Assessment Request',
      order: 1,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Lead Generation Process / Customer Portal',
        input: 'Customer request for site assessment with property details',
        process: 'Create or update request record with assessment flag. Capture property address and access instructions. Set request type to Assessment. Link to customer record.',
        output: 'Assessment request record ready for scheduling',
        customer: 'Scheduling Step'
      },
      tools: ['create_request', 'update_request', 'get_customer'],
      dbEntities: ['requests', 'customers'],
      automationCapabilities: [
        'Auto-create request from customer portal submission',
        'Extract address from customer record if not provided',
        'Flag urgent assessments based on customer tier'
      ]
    },
    {
      id: 'schedule_assessment',
      name: 'Schedule Assessment & Assign Assessor',
      order: 2,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Log Assessment Request Step',
        input: 'Assessment request with customer preferences',
        process: 'Check assessor availability. Create assessment job with is_assessment=true. Schedule for preferred date/time. Assign to qualified assessor. Notify customer and assessor.',
        output: 'Scheduled assessment job with assignment',
        customer: 'Assessor / Customer'
      },
      tools: ['create_assessment_job', 'check_team_availability', 'assign_job', 'send_job_confirmation'],
      dbEntities: ['jobs', 'job_assignments', 'requests'],
      automationCapabilities: [
        'DB TRIGGER: Auto-create checklist on assessment job creation',
        'DB TRIGGER: Auto-update request status to Scheduled',
        'Smart scheduling based on location optimization',
        'Auto-assign based on assessor workload'
      ]
    },
    {
      id: 'conduct_inspection',
      name: 'Conduct Site Inspection',
      order: 3,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Assessor (on-site)',
        input: 'Assessment checklist template, property access',
        process: 'Complete checklist items on mobile app. Record measurements and observations. Note any access issues or hazards. Mark checklist items complete/incomplete.',
        output: 'Completed assessment checklist with observations',
        customer: 'Photo Capture Step'
      },
      tools: ['get_job_checklists', 'update_checklist_item', 'add_job_note'],
      dbEntities: ['checklists', 'checklist_items', 'jobs'],
      automationCapabilities: [
        'Pre-populated checklist from template',
        'GPS verification of on-site presence',
        'Voice-to-text for notes'
      ]
    },
    {
      id: 'capture_photos',
      name: 'Capture Before Photos & Documentation',
      order: 4,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Assessor (on-site)',
        input: 'Property conditions requiring documentation',
        process: 'Take photos of key areas (before condition). Upload with GPS and timestamp metadata. Auto-tag photos as assessment:before. Link photos to job record.',
        output: 'Tagged before photos attached to assessment',
        customer: 'Analysis Step'
      },
      tools: ['upload_job_photo', 'add_media_tags', 'get_job_media'],
      dbEntities: ['media', 'jobs'],
      automationCapabilities: [
        'DB TRIGGER: Auto-tag photos with assessment:before',
        'EXIF extraction for GPS and timestamp',
        'AI vision for auto-categorization (if enabled)'
      ]
    },
    {
      id: 'analyze_issues',
      name: 'Analyze & Flag Issues',
      order: 5,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Assessment Data (checklist + photos)',
        input: 'Completed checklist and photo documentation',
        process: 'Review captured data for risk indicators. Apply AI-assisted risk tagging. Flag items requiring special attention. Update job with risk notes.',
        output: 'Risk-tagged assessment with flagged items',
        customer: 'Report Generation Step'
      },
      tools: ['add_media_tags', 'update_job', 'add_job_note'],
      dbEntities: ['jobs', 'media'],
      automationCapabilities: [
        'AI vision analysis for damage detection',
        'Automated risk scoring based on findings',
        'Pattern matching for common issues'
      ]
    },
    {
      id: 'generate_report',
      name: 'Generate Assessment Report',
      order: 6,
      currentState: 'DWY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'All Previous Steps',
        input: 'Complete assessment data (checklist, photos, risks)',
        process: 'Compile assessment findings into report. Include photos with annotations. Summarize measurements and observations. Generate PDF or structured report. Update request status to Assessed.',
        output: 'Assessment report ready for quoting',
        customer: 'Quoting/Estimating Process'
      },
      tools: ['generate_assessment_report', 'update_request', 'update_job'],
      dbEntities: ['jobs', 'requests', 'reports'],
      automationCapabilities: [
        'DB TRIGGER: Auto-update request status to Assessed',
        'Auto-generate report from template',
        'Include AI-suggested scope of work'
      ]
    }
  ],

  tools: [
    'create_request',
    'update_request',
    'get_customer',
    'create_assessment_job',
    'check_team_availability',
    'assign_job',
    'send_job_confirmation',
    'get_job_checklists',
    'update_checklist_item',
    'add_job_note',
    'upload_job_photo',
    'add_media_tags',
    'get_job_media',
    'update_job',
    'generate_assessment_report'
  ],
  
  inputContract: {
    customer_id: 'uuid',
    address: 'string',
    preferred_date: 'string?',
    access_instructions: 'string?',
    service_interest: 'string?'
  },
  
  outputContract: {
    request_id: 'uuid',
    job_id: 'uuid',
    checklist_id: 'uuid?',
    photos_count: 'number',
    risk_flags: 'string[]',
    assessment_complete: 'boolean',
    report_generated: 'boolean'
  },
  
  entryConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' }
  ],
  
  exitConditions: [
    { type: 'entity_exists', entity: 'job', field: 'id' },
    { type: 'status_equals', entity: 'request', field: 'status', value: 'Assessed' }
  ],
  
  userCheckpoints: ['assessment_scheduling', 'report_approval'],
  
  nextProcesses: [PROCESS_IDS.QUOTING],
  previousProcesses: [PROCESS_IDS.LEAD_GENERATION, PROCESS_IDS.COMMUNICATION]
};

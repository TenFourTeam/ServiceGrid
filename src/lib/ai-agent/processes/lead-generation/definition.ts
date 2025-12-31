/**
 * Lead Generation Process Definition
 */

import { PROCESS_IDS } from '../../process-ids';
import type { ProcessDefinition } from '../types';

export const DEFINITION: ProcessDefinition = {
  id: PROCESS_IDS.LEAD_GENERATION,
  name: 'Lead Generation',
  description: 'Customer discovers your business and initiates contact through various channels',
  phase: 'pre_service',
  position: 1,
  order: 1,
  depth: 0,
  currentState: 'DFY',
  targetState: 'DFY',
  
  sipoc: {
    suppliers: [
      'Website Visitors',
      'Referral Partners',
      'Customer Portal Users',
      'Phone/Email Inquiries'
    ],
    inputs: [
      'Contact Information (name, email, phone)',
      'Service Request Details',
      'Property Address',
      'Referral Source',
      'Preferred Contact Method'
    ],
    processSteps: [
      '1. Receive Inquiry/Referral',
      '2. Qualify Lead',
      '3. Enter Lead into System',
      '4. Assign to Team Member',
      '5. Initial Contact with Lead'
    ],
    outputs: [
      'Qualified Customer Record',
      'Service Request Record',
      'Assignment to Team Member',
      'Initial Contact Logged'
    ],
    customers: [
      'Sales/Estimating Team',
      'Business Owner',
      'AI Agent (for follow-up automation)'
    ]
  },

  subSteps: [
    {
      id: 'receive_inquiry',
      name: 'Receive Inquiry/Referral',
      order: 1,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Prospective Customer',
        input: 'Customer inquiry via phone, email, web form, or customer portal',
        process: 'Customer contacts business through available channels. System captures initial contact info (name, email, phone, service need). Check for duplicate customers by email/phone. Log inquiry details into customers table with source tracking.',
        output: 'New customer record OR matched existing customer, plus service request record',
        customer: 'Lead Qualification (next step)'
      },
      tools: ['create_customer', 'search_customers', 'create_request', 'send_email'],
      dbEntities: ['customers', 'requests'],
      automationCapabilities: [
        'Auto-create customer from portal submission',
        'Duplicate detection by email/phone',
        'Auto-acknowledge receipt via email',
        'DB TRIGGER: Auto-score lead on customer creation',
        'DB TRIGGER: Auto-queue welcome email on customer creation'
      ]
    },
    {
      id: 'qualify_lead',
      name: 'Qualify Lead',
      order: 2,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Previous step (Receive Inquiry)',
        input: 'New customer record with contact info and initial service interest',
        process: 'Review customer data for completeness. Verify service area (check address against business coverage). Assess service type match. Check customer history if returning. Update customer record with qualification notes.',
        output: 'Qualified or disqualified customer with status notes',
        customer: 'System Entry (next step) or Archive (if disqualified)'
      },
      tools: ['get_customer', 'search_customers', 'update_customer', 'score_lead', 'qualify_lead'],
      dbEntities: ['customers', 'requests'],
      automationCapabilities: [
        'Auto-qualify based on service area',
        'Flag VIP returning customers',
        'DB TRIGGER: Auto-score on INSERT/UPDATE',
        'DB TRIGGER: Auto-mark qualified when threshold met'
      ]
    },
    {
      id: 'enter_into_system',
      name: 'Enter Lead into System',
      order: 3,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Lead Qualification step',
        input: 'Qualified lead information with verification',
        process: 'Ensure all required fields populated in customer record. Create service request with details. Link request to customer. Set request status to pending. Add any photos or documents.',
        output: 'Complete customer + request records ready for assignment',
        customer: 'Assignment step'
      },
      tools: ['create_customer', 'update_customer', 'create_request'],
      dbEntities: ['customers', 'requests'],
      automationCapabilities: [
        'Auto-populate missing fields from context',
        'Create request from chat conversation',
        'Attach photos from customer portal upload'
      ]
    },
    {
      id: 'assign_lead',
      name: 'Assign Lead to Sales/Estimator',
      order: 4,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'System Entry step',
        input: 'Complete customer + request record',
        process: 'Review request type and customer location. Check team member availability and workload. Apply assignment rules (territory, expertise). Create quote or assessment job. Assign to appropriate team member. Notify assigned person.',
        output: 'Quote or job assigned to team member with notification sent',
        customer: 'Assigned Team Member'
      },
      tools: ['create_quote', 'create_job', 'assign_job_to_member', 'list_team_members', 'check_team_availability', 'auto_assign_lead'],
      dbEntities: ['quotes', 'jobs', 'job_assignments', 'business_members', 'requests'],
      automationCapabilities: [
        'DB TRIGGER: Auto-assign on new request creation',
        'Configurable assignment method (workload/round-robin)',
        'Territory-based routing',
        'Skill matching for specialized requests'
      ]
    },
    {
      id: 'initial_contact',
      name: 'Initial Contact with Lead',
      order: 5,
      currentState: 'DFY',
      targetState: 'DFY',
      sipoc: {
        supplier: 'Assigned Team Member / AI Agent',
        input: 'Assignment notification with customer details',
        process: 'Review customer information and request details. Select communication channel (email, phone, SMS). Craft personalized outreach highlighting relevant services. Execute initial contact. Log communication in activity log. Set follow-up reminder if no response.',
        output: 'Contact attempt logged, next action scheduled',
        customer: 'Customer (receiving contact) + Sales Team (tracking)'
      },
      tools: ['send_quote', 'send_email', 'invite_to_portal', 'update_job'],
      dbEntities: ['ai_activity_log', 'customers', 'mail_sends', 'email_queue'],
      automationCapabilities: [
        'DB TRIGGER: Auto-queue welcome email on customer creation',
        'Configurable email delay before sending',
        'Edge function processes email queue automatically',
        'Send quote immediately after creation'
      ]
    }
  ],

  tools: [
    'create_customer',
    'update_customer',
    'get_customer',
    'search_customers',
    'create_request',
    'create_quote',
    'create_job',
    'assign_job_to_member',
    'list_team_members',
    'check_team_availability',
    'send_quote',
    'send_email',
    'score_lead',
    'qualify_lead',
    'auto_assign_lead',
    'invite_to_portal'
  ],
  
  inputContract: {
    name: 'string',
    email: 'string',
    phone: 'string?',
    address: 'string?',
    service_interest: 'string?',
    source: 'string?'
  },
  
  outputContract: {
    customer_id: 'uuid',
    request_id: 'uuid?',
    quote_id: 'uuid?',
    job_id: 'uuid?',
    assigned_to: 'uuid?',
    lead_qualified: 'boolean',
    initial_contact_made: 'boolean'
  },
  
  entryConditions: [],
  
  exitConditions: [
    { type: 'entity_exists', entity: 'customer', field: 'id' },
    { type: 'context_check', field: 'lead_qualified', operator: '==', value: true }
  ],
  
  userCheckpoints: ['lead_qualification', 'assignment_approval'],
  
  nextProcesses: [PROCESS_IDS.COMMUNICATION, PROCESS_IDS.SITE_ASSESSMENT, PROCESS_IDS.QUOTING],
  previousProcesses: []
};

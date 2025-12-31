/**
 * Process-EdgeFunction Mapping Registry
 * 
 * Complete mapping of all 15 processes to their DIY/DWY/DFY implementations.
 * This ensures all automation modes produce consistent outcomes.
 */

import { PROCESS_IDS, type ProcessId } from '../../ai-agent/process-ids';
import type { ProcessMapping, ProcessSubStepMapping } from './types';

// ============================================================================
// LEAD GENERATION PROCESS
// ============================================================================

const LEAD_GENERATION_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.LEAD_GENERATION,
  name: 'Lead Generation',
  subSteps: [
    {
      processId: PROCESS_IDS.LEAD_GENERATION,
      subStepId: 'receive_inquiry',
      name: 'Receive Inquiry',
      diy: {
        edgeFunctions: ['customers-crud', 'requests-crud'],
        uiComponents: ['CustomerForm', 'RequestForm', 'NewCustomerDialog'],
        dbTables: ['customers', 'requests'],
        description: 'User manually enters customer and request details via forms',
      },
      dwy: {
        tools: ['create_customer', 'create_request'],
        edgeFunctions: ['customers-crud', 'requests-crud'],
        dbTables: ['customers', 'requests'],
        requiresConfirmation: true,
        description: 'AI creates customer/request, user confirms before saving',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['public-request-submit'],
        dbTables: ['customers', 'requests'],
        description: 'Public form auto-creates customer and request',
      },
      expectedOutcome: {
        entity: 'customer',
        state: { created: true, has_request: true },
        description: 'Customer record exists with associated request',
      },
    },
    {
      processId: PROCESS_IDS.LEAD_GENERATION,
      subStepId: 'score_lead',
      name: 'Score Lead',
      diy: {
        edgeFunctions: ['customers-crud'],
        uiComponents: ['CustomerDetail', 'LeadScoreIndicator'],
        dbTables: ['customers'],
        description: 'User manually assesses and scores lead quality',
      },
      dwy: {
        tools: ['score_lead'],
        edgeFunctions: ['customers-crud'],
        dbTables: ['customers'],
        requiresConfirmation: false,
        description: 'AI calculates lead score based on customer data',
      },
      dfy: {
        triggers: ['trigger_calculate_lead_score'],
        edgeFunctions: [],
        dbTables: ['customers'],
        description: 'Trigger auto-calculates score on customer create/update',
      },
      expectedOutcome: {
        entity: 'customer',
        state: { lead_score: 'number' },
        description: 'Customer has lead_score populated',
      },
    },
    {
      processId: PROCESS_IDS.LEAD_GENERATION,
      subStepId: 'assign_lead',
      name: 'Assign Lead',
      diy: {
        edgeFunctions: ['requests-crud'],
        uiComponents: ['RequestDetail', 'AssignmentDropdown'],
        dbTables: ['requests'],
        description: 'User manually assigns request to team member',
      },
      dwy: {
        tools: ['auto_assign_lead'],
        edgeFunctions: ['requests-crud'],
        dbTables: ['requests'],
        requiresConfirmation: true,
        description: 'AI suggests assignment based on workload/skills',
      },
      dfy: {
        triggers: ['trigger_auto_assign_lead'],
        edgeFunctions: [],
        dbTables: ['requests'],
        description: 'Trigger auto-assigns based on business rules',
      },
      expectedOutcome: {
        entity: 'request',
        state: { assigned_to: 'uuid' },
        description: 'Request has assigned_to field populated',
      },
    },
  ],
};

// ============================================================================
// COMMUNICATION PROCESS
// ============================================================================

const COMMUNICATION_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.COMMUNICATION,
  name: 'Communication',
  subSteps: [
    {
      processId: PROCESS_IDS.COMMUNICATION,
      subStepId: 'send_message',
      name: 'Send Message',
      diy: {
        edgeFunctions: ['messages-crud', 'conversations-crud'],
        uiComponents: ['ConversationPanel', 'MessageComposer'],
        dbTables: ['messages', 'conversations'],
        description: 'User composes and sends message via conversation UI',
      },
      dwy: {
        tools: ['send_message', 'create_conversation'],
        edgeFunctions: ['messages-crud', 'conversations-crud'],
        dbTables: ['messages', 'conversations'],
        requiresConfirmation: true,
        description: 'AI drafts message, user reviews and sends',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['send-lifecycle-email', 'process-email-queue'],
        scheduledJobs: ['process-email-queue'],
        dbTables: ['messages', 'email_queue'],
        description: 'Automated lifecycle emails sent on triggers',
      },
      expectedOutcome: {
        entity: 'message',
        state: { created: true, sent: true },
        description: 'Message created and sent to recipient',
      },
    },
    {
      processId: PROCESS_IDS.COMMUNICATION,
      subStepId: 'send_welcome_email',
      name: 'Send Welcome Email',
      diy: {
        edgeFunctions: ['send-lifecycle-email'],
        uiComponents: ['CustomerDetail', 'SendEmailButton'],
        dbTables: ['email_queue', 'customers'],
        description: 'User manually triggers welcome email',
      },
      dwy: {
        tools: ['send_welcome_email'],
        edgeFunctions: ['send-lifecycle-email'],
        dbTables: ['email_queue', 'customers'],
        requiresConfirmation: true,
        description: 'AI suggests sending welcome email',
      },
      dfy: {
        triggers: ['trigger_queue_welcome_email'],
        edgeFunctions: ['process-email-queue'],
        scheduledJobs: ['process-email-queue'],
        dbTables: ['email_queue', 'customers'],
        description: 'Auto-queues welcome email on customer creation',
      },
      expectedOutcome: {
        entity: 'email_queue',
        state: { queued: true, email_type: 'welcome' },
        description: 'Welcome email queued for delivery',
      },
    },
  ],
};

// ============================================================================
// SITE ASSESSMENT PROCESS
// ============================================================================

const SITE_ASSESSMENT_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.SITE_ASSESSMENT,
  name: 'Site Assessment',
  subSteps: [
    {
      processId: PROCESS_IDS.SITE_ASSESSMENT,
      subStepId: 'create_assessment_job',
      name: 'Create Assessment Job',
      diy: {
        edgeFunctions: ['jobs-crud'],
        uiComponents: ['JobForm', 'NewJobDialog'],
        dbTables: ['jobs'],
        description: 'User creates assessment job via form',
      },
      dwy: {
        tools: ['create_job'],
        edgeFunctions: ['jobs-crud'],
        dbTables: ['jobs'],
        requiresConfirmation: true,
        description: 'AI creates assessment job from request context',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['jobs-crud'],
        dbTables: ['jobs'],
        description: 'No full automation - requires human scheduling',
      },
      expectedOutcome: {
        entity: 'job',
        state: { created: true, job_type: 'assessment' },
        description: 'Assessment job created',
      },
    },
    {
      processId: PROCESS_IDS.SITE_ASSESSMENT,
      subStepId: 'capture_site_media',
      name: 'Capture Site Media',
      diy: {
        edgeFunctions: ['job-media-crud', 'upload-job-photo'],
        uiComponents: ['MediaUploader', 'JobMediaGallery'],
        dbTables: ['sg_media'],
        description: 'User uploads photos/videos from site',
      },
      dwy: {
        tools: [],
        edgeFunctions: ['job-media-crud', 'upload-job-photo'],
        dbTables: ['sg_media'],
        requiresConfirmation: false,
        description: 'No AI assistance for media capture',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['customer-upload-media'],
        dbTables: ['sg_media'],
        description: 'Customer can upload via portal',
      },
      expectedOutcome: {
        entity: 'sg_media',
        state: { uploaded: true, job_id: 'uuid' },
        description: 'Media files attached to job',
      },
    },
  ],
};

// ============================================================================
// QUOTING PROCESS
// ============================================================================

const QUOTING_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.QUOTING,
  name: 'Quoting & Estimating',
  subSteps: [
    {
      processId: PROCESS_IDS.QUOTING,
      subStepId: 'create_quote',
      name: 'Create Quote',
      diy: {
        edgeFunctions: ['quotes-crud'],
        uiComponents: ['QuoteBuilder', 'QuoteForm', 'NewQuoteDialog'],
        dbTables: ['quotes', 'quote_line_items'],
        description: 'User builds quote with line items',
      },
      dwy: {
        tools: ['create_quote', 'add_quote_line_item'],
        edgeFunctions: ['quotes-crud'],
        dbTables: ['quotes', 'quote_line_items'],
        requiresConfirmation: true,
        description: 'AI generates quote from assessment, user adjusts',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['quotes-crud'],
        dbTables: ['quotes', 'quote_line_items'],
        description: 'No full automation - quotes require human judgment',
      },
      expectedOutcome: {
        entity: 'quote',
        state: { created: true, status: 'draft' },
        description: 'Quote created with line items',
      },
    },
    {
      processId: PROCESS_IDS.QUOTING,
      subStepId: 'send_quote',
      name: 'Send Quote to Customer',
      diy: {
        edgeFunctions: ['quote-events', 'send-lifecycle-email'],
        uiComponents: ['QuoteDetail', 'SendQuoteButton'],
        dbTables: ['quotes', 'quote_events'],
        description: 'User sends quote via email/portal',
      },
      dwy: {
        tools: ['send_quote'],
        edgeFunctions: ['quote-events', 'send-lifecycle-email'],
        dbTables: ['quotes', 'quote_events'],
        requiresConfirmation: true,
        description: 'AI suggests sending quote when ready',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['quote-events'],
        dbTables: ['quotes', 'quote_events'],
        description: 'No auto-send - requires user decision',
      },
      expectedOutcome: {
        entity: 'quote',
        state: { status: 'sent', sent_at: 'timestamp' },
        description: 'Quote sent to customer',
      },
    },
  ],
};

// ============================================================================
// SCHEDULING PROCESS
// ============================================================================

const SCHEDULING_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.SCHEDULING,
  name: 'Scheduling',
  subSteps: [
    {
      processId: PROCESS_IDS.SCHEDULING,
      subStepId: 'check_availability',
      name: 'Check Team Availability',
      diy: {
        edgeFunctions: ['team-availability-crud', 'check-scheduling-capacity'],
        uiComponents: ['CalendarView', 'AvailabilityPanel'],
        dbTables: ['team_availability', 'time_off'],
        description: 'User checks calendar for available slots',
      },
      dwy: {
        tools: ['check_team_availability'],
        edgeFunctions: ['check-scheduling-capacity'],
        dbTables: ['team_availability', 'time_off'],
        requiresConfirmation: false,
        description: 'AI finds optimal available slots',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['check-scheduling-capacity'],
        dbTables: ['team_availability', 'time_off'],
        description: 'Availability checked during auto-scheduling',
      },
      expectedOutcome: {
        entity: 'availability',
        state: { checked: true, slots_found: true },
        description: 'Available time slots identified',
      },
    },
    {
      processId: PROCESS_IDS.SCHEDULING,
      subStepId: 'schedule_job',
      name: 'Schedule Job',
      diy: {
        edgeFunctions: ['jobs-crud'],
        uiComponents: ['CalendarView', 'JobScheduleModal', 'DragDropScheduler'],
        dbTables: ['jobs'],
        description: 'User drags/drops job to calendar slot',
      },
      dwy: {
        tools: ['schedule_job'],
        edgeFunctions: ['jobs-crud', 'auto-schedule-request'],
        dbTables: ['jobs'],
        requiresConfirmation: true,
        description: 'AI suggests optimal schedule time',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['auto-generate-recurring-jobs'],
        scheduledJobs: ['auto-generate-recurring-jobs'],
        dbTables: ['jobs', 'recurring_schedules'],
        description: 'Recurring jobs auto-generated',
      },
      expectedOutcome: {
        entity: 'job',
        state: { scheduled_start: 'timestamp', status: 'scheduled' },
        description: 'Job has scheduled date/time',
      },
    },
    {
      processId: PROCESS_IDS.SCHEDULING,
      subStepId: 'assign_team',
      name: 'Assign Team Members',
      diy: {
        edgeFunctions: ['jobs-crud-assign', 'unified-assignments'],
        uiComponents: ['AssignmentPanel', 'TeamSelector'],
        dbTables: ['job_assignments'],
        description: 'User assigns team members to job',
      },
      dwy: {
        tools: ['assign_job'],
        edgeFunctions: ['jobs-crud-assign', 'unified-assignments'],
        dbTables: ['job_assignments'],
        requiresConfirmation: true,
        description: 'AI recommends best team for job',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['unified-assignments'],
        dbTables: ['job_assignments'],
        description: 'Auto-assignment based on recurring schedule',
      },
      expectedOutcome: {
        entity: 'job_assignments',
        state: { assigned: true },
        description: 'Team members assigned to job',
      },
    },
  ],
};

// ============================================================================
// DISPATCHING PROCESS
// ============================================================================

const DISPATCHING_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.DISPATCH,
  name: 'Dispatching',
  subSteps: [
    {
      processId: PROCESS_IDS.DISPATCH,
      subStepId: 'dispatch_crew',
      name: 'Dispatch Crew',
      diy: {
        edgeFunctions: ['jobs-crud', 'send-work-order-confirmations'],
        uiComponents: ['DispatchBoard', 'WorkOrderCard'],
        dbTables: ['jobs'],
        description: 'User updates job status and notifies crew',
      },
      dwy: {
        tools: ['dispatch_job'],
        edgeFunctions: ['jobs-crud', 'send-work-order-confirmations'],
        dbTables: ['jobs'],
        requiresConfirmation: true,
        description: 'AI suggests dispatch order based on routes',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['send-work-order-confirmations'],
        dbTables: ['jobs'],
        description: 'Auto-notification on job start day',
      },
      expectedOutcome: {
        entity: 'job',
        state: { status: 'dispatched' },
        description: 'Crew notified and job dispatched',
      },
    },
    {
      processId: PROCESS_IDS.DISPATCH,
      subStepId: 'optimize_route',
      name: 'Optimize Route',
      diy: {
        edgeFunctions: ['optimize-job-route', 'calculate-route-directions'],
        uiComponents: ['RouteMap', 'RouteOptimizer'],
        dbTables: ['jobs'],
        description: 'User reviews and adjusts route',
      },
      dwy: {
        tools: ['optimize_route'],
        edgeFunctions: ['optimize-job-route', 'calculate-travel-times'],
        dbTables: ['jobs'],
        requiresConfirmation: false,
        description: 'AI optimizes route for efficiency',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['optimize-job-route'],
        dbTables: ['jobs'],
        description: 'Route auto-optimized on dispatch',
      },
      expectedOutcome: {
        entity: 'jobs',
        state: { route_optimized: true },
        description: 'Optimal route calculated',
      },
    },
  ],
};

// ============================================================================
// QUALITY ASSURANCE PROCESS
// ============================================================================

const QUALITY_ASSURANCE_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.QUALITY_ASSURANCE,
  name: 'Quality Assurance',
  subSteps: [
    {
      processId: PROCESS_IDS.QUALITY_ASSURANCE,
      subStepId: 'create_checklist',
      name: 'Create QA Checklist',
      diy: {
        edgeFunctions: ['checklists-crud', 'checklist-templates-crud'],
        uiComponents: ['ChecklistBuilder', 'ChecklistTemplateList'],
        dbTables: ['checklists', 'checklist_items'],
        description: 'User creates checklist from template',
      },
      dwy: {
        tools: ['create_checklist'],
        edgeFunctions: ['checklists-crud'],
        dbTables: ['checklists', 'checklist_items'],
        requiresConfirmation: false,
        description: 'AI creates checklist based on job type',
      },
      dfy: {
        triggers: ['trigger_create_job_checklist'],
        edgeFunctions: ['checklists-crud'],
        dbTables: ['checklists', 'checklist_items'],
        description: 'Auto-create checklist on job creation',
      },
      expectedOutcome: {
        entity: 'checklist',
        state: { created: true, job_id: 'uuid' },
        description: 'QA checklist attached to job',
      },
    },
    {
      processId: PROCESS_IDS.QUALITY_ASSURANCE,
      subStepId: 'complete_checklist',
      name: 'Complete Checklist Items',
      diy: {
        edgeFunctions: ['checklist-item-complete', 'checklist-activity'],
        uiComponents: ['ChecklistView', 'ChecklistItem'],
        dbTables: ['checklist_items'],
        description: 'User marks items complete in the field',
      },
      dwy: {
        tools: [],
        edgeFunctions: ['checklist-item-complete'],
        dbTables: ['checklist_items'],
        requiresConfirmation: false,
        description: 'No AI assistance - field verification required',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['checklist-item-complete'],
        dbTables: ['checklist_items'],
        description: 'No automation - requires human verification',
      },
      expectedOutcome: {
        entity: 'checklist_items',
        state: { completed: true },
        description: 'All checklist items completed',
      },
    },
  ],
};

// ============================================================================
// INVOICING PROCESS
// ============================================================================

const INVOICING_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.INVOICING,
  name: 'Invoicing',
  subSteps: [
    {
      processId: PROCESS_IDS.INVOICING,
      subStepId: 'create_invoice',
      name: 'Create Invoice',
      diy: {
        edgeFunctions: ['invoices-crud'],
        uiComponents: ['InvoiceForm', 'InvoiceBuilder'],
        dbTables: ['invoices', 'invoice_line_items'],
        description: 'User creates invoice manually',
      },
      dwy: {
        tools: ['create_invoice', 'add_invoice_line_item'],
        edgeFunctions: ['invoices-crud'],
        dbTables: ['invoices', 'invoice_line_items'],
        requiresConfirmation: true,
        description: 'AI generates invoice from job/quote',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['auto-generate-recurring-invoices'],
        scheduledJobs: ['auto-generate-recurring-invoices'],
        dbTables: ['invoices', 'invoice_line_items'],
        description: 'Auto-generate recurring invoices',
      },
      expectedOutcome: {
        entity: 'invoice',
        state: { created: true, status: 'draft' },
        description: 'Invoice created with line items',
      },
    },
    {
      processId: PROCESS_IDS.INVOICING,
      subStepId: 'send_invoice',
      name: 'Send Invoice',
      diy: {
        edgeFunctions: ['invoices-crud', 'send-lifecycle-email'],
        uiComponents: ['InvoiceDetail', 'SendInvoiceButton'],
        dbTables: ['invoices'],
        description: 'User sends invoice to customer',
      },
      dwy: {
        tools: ['send_invoice'],
        edgeFunctions: ['invoices-crud', 'send-lifecycle-email'],
        dbTables: ['invoices'],
        requiresConfirmation: true,
        description: 'AI suggests sending invoice when ready',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['send-lifecycle-email'],
        dbTables: ['invoices'],
        description: 'Auto-send on approval (if configured)',
      },
      expectedOutcome: {
        entity: 'invoice',
        state: { status: 'sent', sent_at: 'timestamp' },
        description: 'Invoice sent to customer',
      },
    },
  ],
};

// ============================================================================
// PAYMENT COLLECTION PROCESS
// ============================================================================

const PAYMENT_COLLECTION_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.PAYMENT_COLLECTION,
  name: 'Payment Collection',
  subSteps: [
    {
      processId: PROCESS_IDS.PAYMENT_COLLECTION,
      subStepId: 'create_payment_link',
      name: 'Create Payment Link',
      diy: {
        edgeFunctions: ['create-invoice-payment', 'create-invoice-payment-public'],
        uiComponents: ['InvoiceDetail', 'PaymentLinkGenerator'],
        dbTables: ['invoices'],
        description: 'User generates payment link for invoice',
      },
      dwy: {
        tools: [],
        edgeFunctions: ['create-invoice-payment'],
        dbTables: ['invoices'],
        requiresConfirmation: false,
        description: 'Payment link auto-included in invoice emails',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['create-invoice-payment-public'],
        dbTables: ['invoices'],
        description: 'Customer can pay via portal',
      },
      expectedOutcome: {
        entity: 'invoice',
        state: { payment_link_generated: true },
        description: 'Payment link available',
      },
    },
    {
      processId: PROCESS_IDS.PAYMENT_COLLECTION,
      subStepId: 'process_payment',
      name: 'Process Payment',
      diy: {
        edgeFunctions: ['payments-crud', 'verify-payment'],
        uiComponents: ['PaymentForm', 'RecordPaymentDialog'],
        dbTables: ['payments', 'invoices'],
        description: 'User records manual payment',
      },
      dwy: {
        tools: ['record_payment'],
        edgeFunctions: ['payments-crud'],
        dbTables: ['payments', 'invoices'],
        requiresConfirmation: true,
        description: 'AI helps reconcile payments',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['stripe-webhooks', 'verify-payment'],
        dbTables: ['payments', 'invoices'],
        description: 'Stripe webhooks auto-update payment status',
      },
      expectedOutcome: {
        entity: 'payment',
        state: { created: true, status: 'completed' },
        description: 'Payment recorded and invoice updated',
      },
    },
  ],
};

// ============================================================================
// REMAINING PROCESSES (MINIMAL MAPPINGS)
// ============================================================================

const REVIEW_MANAGEMENT_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.REVIEW_MANAGEMENT,
  name: 'Review Management',
  subSteps: [
    {
      processId: PROCESS_IDS.REVIEW_MANAGEMENT,
      subStepId: 'request_review',
      name: 'Request Review',
      diy: {
        edgeFunctions: ['send-lifecycle-email'],
        uiComponents: ['JobDetail', 'RequestReviewButton'],
        dbTables: ['email_queue'],
        description: 'User sends review request email',
      },
      dwy: {
        tools: ['send_review_request'],
        edgeFunctions: ['send-lifecycle-email'],
        dbTables: ['email_queue'],
        requiresConfirmation: true,
        description: 'AI suggests optimal time to request review',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['send-lifecycle-email'],
        scheduledJobs: ['process-email-queue'],
        dbTables: ['email_queue'],
        description: 'Auto-request review after job completion',
      },
      expectedOutcome: {
        entity: 'email_queue',
        state: { queued: true, email_type: 'review_request' },
        description: 'Review request sent',
      },
    },
  ],
};

const MAINTENANCE_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.MAINTENANCE,
  name: 'Preventive Maintenance',
  subSteps: [
    {
      processId: PROCESS_IDS.MAINTENANCE,
      subStepId: 'create_recurring_schedule',
      name: 'Create Recurring Schedule',
      diy: {
        edgeFunctions: ['recurring-schedules-crud'],
        uiComponents: ['RecurringScheduleForm', 'MaintenancePlanBuilder'],
        dbTables: ['recurring_schedules'],
        description: 'User sets up recurring maintenance schedule',
      },
      dwy: {
        tools: ['create_recurring_schedule'],
        edgeFunctions: ['recurring-schedules-crud'],
        dbTables: ['recurring_schedules'],
        requiresConfirmation: true,
        description: 'AI suggests maintenance frequency',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['recurring-schedules-crud'],
        dbTables: ['recurring_schedules'],
        description: 'No automation - business decision required',
      },
      expectedOutcome: {
        entity: 'recurring_schedule',
        state: { created: true, is_active: true },
        description: 'Recurring schedule configured',
      },
    },
    {
      processId: PROCESS_IDS.MAINTENANCE,
      subStepId: 'generate_maintenance_jobs',
      name: 'Generate Maintenance Jobs',
      diy: {
        edgeFunctions: ['generate-recurring-jobs'],
        uiComponents: ['RecurringScheduleDetail', 'GenerateJobsButton'],
        dbTables: ['jobs', 'recurring_schedules'],
        description: 'User manually generates upcoming jobs',
      },
      dwy: {
        tools: ['generate_recurring_jobs'],
        edgeFunctions: ['generate-recurring-jobs'],
        dbTables: ['jobs', 'recurring_schedules'],
        requiresConfirmation: true,
        description: 'AI generates jobs for scheduling review',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['auto-generate-recurring-jobs'],
        scheduledJobs: ['auto-generate-recurring-jobs'],
        dbTables: ['jobs', 'recurring_schedules'],
        description: 'Auto-generate jobs on schedule',
      },
      expectedOutcome: {
        entity: 'jobs',
        state: { created: true, recurring_schedule_id: 'uuid' },
        description: 'Maintenance jobs generated',
      },
    },
  ],
};

const WARRANTY_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.WARRANTY,
  name: 'Warranty Management',
  subSteps: [
    {
      processId: PROCESS_IDS.WARRANTY,
      subStepId: 'track_warranty',
      name: 'Track Warranty',
      diy: {
        edgeFunctions: ['jobs-crud'],
        uiComponents: ['JobDetail', 'WarrantyInfo'],
        dbTables: ['jobs'],
        description: 'User tracks warranty info on jobs',
      },
      dwy: {
        tools: [],
        edgeFunctions: ['jobs-crud'],
        dbTables: ['jobs'],
        requiresConfirmation: false,
        description: 'No AI assistance currently',
      },
      dfy: {
        triggers: [],
        edgeFunctions: [],
        dbTables: ['jobs'],
        description: 'No automation currently',
      },
      expectedOutcome: {
        entity: 'job',
        state: { warranty_tracked: true },
        description: 'Warranty information recorded',
      },
    },
  ],
};

const INVENTORY_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.INVENTORY,
  name: 'Inventory Management',
  subSteps: [
    {
      processId: PROCESS_IDS.INVENTORY,
      subStepId: 'track_inventory',
      name: 'Track Inventory',
      diy: {
        edgeFunctions: [],
        uiComponents: ['InventoryList', 'InventoryForm'],
        dbTables: ['inventory_items', 'inventory_transactions'],
        description: 'User manages inventory via UI (direct DB)',
      },
      dwy: {
        tools: ['update_inventory'],
        edgeFunctions: [],
        dbTables: ['inventory_items', 'inventory_transactions'],
        requiresConfirmation: true,
        description: 'AI tracks usage and suggests reorders',
      },
      dfy: {
        triggers: [],
        edgeFunctions: [],
        dbTables: ['inventory_items'],
        description: 'No full automation currently',
      },
      expectedOutcome: {
        entity: 'inventory_items',
        state: { tracked: true },
        description: 'Inventory levels updated',
      },
    },
  ],
};

const ANALYTICS_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.ANALYTICS,
  name: 'Reporting & Analytics',
  subSteps: [
    {
      processId: PROCESS_IDS.ANALYTICS,
      subStepId: 'generate_report',
      name: 'Generate Reports',
      diy: {
        edgeFunctions: ['analytics-summary', 'time-tracking-analytics', 'time-breakdown-report'],
        uiComponents: ['AnalyticsDashboard', 'ReportViewer'],
        dbTables: [],
        description: 'User views analytics dashboards',
      },
      dwy: {
        tools: ['generate_analytics_summary'],
        edgeFunctions: ['analytics-summary'],
        dbTables: [],
        requiresConfirmation: false,
        description: 'AI summarizes key metrics',
      },
      dfy: {
        triggers: [],
        edgeFunctions: ['analytics-summary'],
        scheduledJobs: [],
        dbTables: [],
        description: 'Scheduled report generation possible',
      },
      expectedOutcome: {
        entity: 'report',
        state: { generated: true },
        description: 'Analytics report generated',
      },
    },
  ],
};

const SEASONAL_PLANNING_MAPPING: ProcessMapping = {
  processId: PROCESS_IDS.SEASONAL_PLANNING,
  name: 'Seasonal Planning',
  subSteps: [
    {
      processId: PROCESS_IDS.SEASONAL_PLANNING,
      subStepId: 'plan_season',
      name: 'Plan Season',
      diy: {
        edgeFunctions: ['business-constraints-crud'],
        uiComponents: ['SeasonalPlanner', 'CapacityPlanner'],
        dbTables: ['business_constraints'],
        description: 'User sets seasonal constraints',
      },
      dwy: {
        tools: ['suggest_seasonal_plan'],
        edgeFunctions: ['business-constraints-crud', 'predict-scheduling'],
        dbTables: ['business_constraints'],
        requiresConfirmation: true,
        description: 'AI suggests capacity adjustments',
      },
      dfy: {
        triggers: [],
        edgeFunctions: [],
        dbTables: ['business_constraints'],
        description: 'No full automation - strategic decision',
      },
      expectedOutcome: {
        entity: 'business_constraints',
        state: { configured: true },
        description: 'Seasonal plan configured',
      },
    },
  ],
};

// ============================================================================
// COMPLETE REGISTRY
// ============================================================================

export const PROCESS_FUNCTION_MAPPINGS: Record<ProcessId, ProcessMapping> = {
  [PROCESS_IDS.LEAD_GENERATION]: LEAD_GENERATION_MAPPING,
  [PROCESS_IDS.COMMUNICATION]: COMMUNICATION_MAPPING,
  [PROCESS_IDS.SITE_ASSESSMENT]: SITE_ASSESSMENT_MAPPING,
  [PROCESS_IDS.QUOTING]: QUOTING_MAPPING,
  [PROCESS_IDS.SCHEDULING]: SCHEDULING_MAPPING,
  [PROCESS_IDS.DISPATCH]: DISPATCHING_MAPPING,
  [PROCESS_IDS.QUALITY_ASSURANCE]: QUALITY_ASSURANCE_MAPPING,
  [PROCESS_IDS.MAINTENANCE]: MAINTENANCE_MAPPING,
  [PROCESS_IDS.INVOICING]: INVOICING_MAPPING,
  [PROCESS_IDS.PAYMENT_COLLECTION]: PAYMENT_COLLECTION_MAPPING,
  [PROCESS_IDS.REVIEW_MANAGEMENT]: REVIEW_MANAGEMENT_MAPPING,
  [PROCESS_IDS.WARRANTY]: WARRANTY_MAPPING,
  [PROCESS_IDS.INVENTORY]: INVENTORY_MAPPING,
  [PROCESS_IDS.ANALYTICS]: ANALYTICS_MAPPING,
  [PROCESS_IDS.SEASONAL_PLANNING]: SEASONAL_PLANNING_MAPPING,
};

/**
 * Get all edge functions referenced across all process mappings
 */
export function getAllReferencedEdgeFunctions(): string[] {
  const functions = new Set<string>();
  
  for (const mapping of Object.values(PROCESS_FUNCTION_MAPPINGS)) {
    for (const step of mapping.subSteps) {
      step.diy.edgeFunctions.forEach(fn => functions.add(fn));
      step.dwy.edgeFunctions.forEach(fn => functions.add(fn));
      step.dfy.edgeFunctions.forEach(fn => functions.add(fn));
    }
  }
  
  return Array.from(functions).sort();
}

/**
 * Get all tools referenced across all process mappings
 */
export function getAllReferencedTools(): string[] {
  const tools = new Set<string>();
  
  for (const mapping of Object.values(PROCESS_FUNCTION_MAPPINGS)) {
    for (const step of mapping.subSteps) {
      step.dwy.tools.forEach(tool => tools.add(tool));
    }
  }
  
  return Array.from(tools).sort();
}

/**
 * Get all triggers referenced across all process mappings
 */
export function getAllReferencedTriggers(): string[] {
  const triggers = new Set<string>();
  
  for (const mapping of Object.values(PROCESS_FUNCTION_MAPPINGS)) {
    for (const step of mapping.subSteps) {
      step.dfy.triggers.forEach(trigger => triggers.add(trigger));
    }
  }
  
  return Array.from(triggers).sort();
}

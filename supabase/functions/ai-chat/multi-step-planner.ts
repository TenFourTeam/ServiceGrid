/**
 * Multi-Step Planner
 * 
 * Enables complex tasks requiring multiple tool calls with:
 * - Task decomposition into subtasks
 * - Sequential tool execution with state tracking
 * - Progress reporting for long-running tasks
 * - Rollback on failure
 * - Step verification against tool contracts
 */

// Import MemoryContext type early since it's used in executePlan
import { 
  type MemoryContext,
} from './memory-manager.ts';

// Import step verifier
import {
  executeWithVerification,
  logVerificationResult,
  hasContract,
  type StepExecutionContext,
  type VerifiedStepResult,
} from './step-verifier.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface PlanStep {
  id: string;
  name: string;
  description: string;
  tool: string;
  args: Record<string, any>;
  dependsOn: string[];  // Step IDs this depends on
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back' | 'skipped';
  result?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  // Verification and rollback info for enhanced feedback
  verification?: {
    phase: string;
    failedAssertion?: string;
    recoverySuggestion?: string;
  };
  rollbackExecuted?: boolean;
  rollbackTool?: string;
}

export interface ExecutionPlan {
  id: string;
  name: string;
  description: string;
  steps: PlanStep[];
  status: 'planning' | 'awaiting_approval' | 'executing' | 'completed' | 'failed' | 'rolled_back' | 'cancelled' | 'awaiting_recovery';
  currentStepIndex: number;
  createdAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  rollbackSteps?: PlanStep[];
  pausedAtStep?: number;
}

export interface NextProcessSuggestion {
  processId: string;
  patternId: string;
  reason: string;
  contextToPass: Record<string, any>;
  fromProcess: string;
}

export interface PlannerResult {
  type: 'plan_preview' | 'step_progress' | 'step_complete' | 'plan_complete' | 'plan_failed' | 'plan_cancelled';
  plan: ExecutionPlan;
  currentStep?: PlanStep;
  message?: string;
  nextProcessSuggestion?: NextProcessSuggestion;
}

export interface ExecutionContext {
  supabase: any;
  businessId: string;
  userId: string;
  controller?: ReadableStreamDefaultController;
  tools: Record<string, any>;
}

// =============================================================================
// MULTI-STEP PATTERNS
// =============================================================================

interface MultiStepPattern {
  id: string;
  name: string;
  description: string;
  patterns: RegExp[];
  keywords: string[];
  steps: Array<{
    name: string;
    description: string;
    tool: string;
    argMapping: (context: any, previousResults: Record<string, any>) => Record<string, any>;
    dependsOn?: string[];
    optional?: boolean;
  }>;
  requiresApproval: boolean;
  // Special card type for custom UI rendering (e.g., 'lead_workflow', 'assessment_workflow', 'communication_workflow')
  specialCardType?: 'lead_workflow' | 'assessment_workflow' | 'communication_workflow';
}

const MULTI_STEP_PATTERNS: MultiStepPattern[] = [
  // Schedule all + send confirmations
  {
    id: 'schedule_and_notify',
    name: 'Schedule Jobs & Send Confirmations',
    description: 'Schedule all pending jobs and send confirmation emails to customers',
    patterns: [
      /schedule\s+(all|the|my)\s+(pending|unscheduled)?\s*jobs?\s+(and|then)\s+(send|email|notify)/i,
      /batch\s+schedule\s+(and|then)\s+notify/i,
      /schedule\s+everything\s+and\s+confirm/i,
    ],
    keywords: ['schedule', 'send', 'confirm', 'notify', 'email'],
    steps: [
      {
        name: 'Get Unscheduled Jobs',
        description: 'Find all jobs that need scheduling',
        tool: 'get_unscheduled_jobs',
        argMapping: () => ({}),
      },
      {
        name: 'Schedule Jobs',
        description: 'Schedule jobs using AI optimization',
        tool: 'batch_schedule_jobs',
        argMapping: (ctx, results) => ({
          jobIds: results['get_unscheduled_jobs']?.unscheduled_jobs?.map((j: any) => j.id) || [],
        }),
        dependsOn: ['get_unscheduled_jobs'],
      },
      {
        name: 'Send Confirmations',
        description: 'Email customers with appointment details',
        tool: 'send_job_confirmations',
        argMapping: (ctx, results) => ({
          jobIds: results['batch_schedule_jobs']?.scheduledJobs?.map((j: any) => j.jobId) || [],
        }),
        dependsOn: ['batch_schedule_jobs'],
      },
    ],
    requiresApproval: true,
  },

  // Create invoice and send
  {
    id: 'create_and_send_invoice',
    name: 'Create & Send Invoice',
    description: 'Create an invoice from a quote or job and send it to the customer',
    patterns: [
      /create\s+(an?\s+)?invoice\s+(from|for)\s+.+\s+(and|then)\s+send/i,
      /invoice\s+.+\s+and\s+email/i,
      /bill\s+(the\s+)?customer\s+and\s+send/i,
    ],
    keywords: ['create', 'invoice', 'send', 'email', 'bill'],
    steps: [
      {
        name: 'Create Invoice',
        description: 'Generate invoice from quote or job',
        tool: 'create_invoice',
        argMapping: (ctx) => ({
          quoteId: ctx.entities?.quoteId,
          jobId: ctx.entities?.jobId,
          customerId: ctx.entities?.customerId,
        }),
      },
      {
        name: 'Send Invoice',
        description: 'Email invoice to customer',
        tool: 'send_invoice',
        argMapping: (ctx, results) => ({
          invoiceId: results['create_invoice']?.invoice_id,
        }),
        dependsOn: ['create_invoice'],
      },
    ],
    requiresApproval: true,
  },

  // Approve quote and create job
  {
    id: 'approve_quote_and_create_job',
    name: 'Approve Quote & Create Job',
    description: 'Approve the quote, create a job from it, and optionally assign a checklist',
    patterns: [
      /approve\s+(the\s+)?quote\s+(and|then)\s+(create|make)\s+(a\s+)?job/i,
      /convert\s+(approved\s+)?quote\s+to\s+job/i,
      /turn\s+quote\s+into\s+job/i,
    ],
    keywords: ['approve', 'quote', 'create', 'job', 'convert'],
    steps: [
      {
        name: 'Approve Quote',
        description: 'Mark the quote as approved',
        tool: 'approve_quote',
        argMapping: (ctx) => ({
          quoteId: ctx.entities?.quoteId,
        }),
      },
      {
        name: 'Create Job',
        description: 'Convert the approved quote to a work order',
        tool: 'convert_quote_to_job',
        argMapping: (ctx, results) => ({
          quoteId: results['approve_quote']?.quote_id || ctx.entities?.quoteId,
        }),
        dependsOn: ['approve_quote'],
      },
      {
        name: 'Assign Checklist',
        description: 'Attach a checklist template to the new job',
        tool: 'assign_checklist_to_job',
        argMapping: (ctx, results) => ({
          jobId: results['convert_quote_to_job']?.job_id,
          templateId: ctx.entities?.checklistTemplateId || 'default',
        }),
        dependsOn: ['convert_quote_to_job'],
        optional: true,
      },
    ],
    requiresApproval: true,
  },

  // Close completed jobs and invoice
  {
    id: 'close_jobs_and_invoice',
    name: 'Close Jobs & Generate Invoices',
    description: 'Mark completed jobs as closed and create invoices for them',
    patterns: [
      /close\s+(all\s+)?completed\s+jobs\s+(and|then)\s+(generate|create)\s+invoices?/i,
      /finish\s+jobs\s+and\s+bill/i,
      /complete\s+jobs\s+and\s+invoice/i,
    ],
    keywords: ['close', 'complete', 'jobs', 'invoice', 'bill'],
    steps: [
      {
        name: 'Get Completed Jobs',
        description: 'Find all jobs marked as completed',
        tool: 'get_completed_jobs',
        argMapping: (ctx) => ({
          dateRange: ctx.entities?.dateRange,
        }),
      },
      {
        name: 'Close Jobs',
        description: 'Update job status to closed',
        tool: 'batch_update_job_status',
        argMapping: (ctx, results) => ({
          jobIds: results['get_completed_jobs']?.jobs?.map((j: any) => j.id) || [],
          newStatus: 'Closed',
        }),
        dependsOn: ['get_completed_jobs'],
      },
      {
        name: 'Generate Invoices',
        description: 'Create invoices for closed jobs',
        tool: 'batch_create_invoices',
        argMapping: (ctx, results) => ({
          jobIds: results['batch_update_job_status']?.updatedJobIds || [],
        }),
        dependsOn: ['batch_update_job_status'],
      },
    ],
    requiresApproval: true,
  },

  // Send payment reminders
  {
    id: 'send_payment_reminders',
    name: 'Send Payment Reminders',
    description: 'Find overdue invoices and send reminder emails',
    patterns: [
      /send\s+(all\s+)?payment\s+reminders?/i,
      /remind\s+(all\s+)?customers?\s+(about\s+)?(overdue\s+)?payments?/i,
      /follow\s+up\s+on\s+(all\s+)?unpaid\s+invoices?/i,
    ],
    keywords: ['remind', 'payment', 'overdue', 'follow up', 'unpaid'],
    steps: [
      {
        name: 'Get Overdue Invoices',
        description: 'Find all invoices past their due date',
        tool: 'get_overdue_invoices',
        argMapping: () => ({}),
      },
      {
        name: 'Send Reminders',
        description: 'Email payment reminders to customers',
        tool: 'batch_send_reminders',
        argMapping: (ctx, results) => ({
          invoiceIds: results['get_overdue_invoices']?.invoices?.map((i: any) => i.id) || [],
        }),
        dependsOn: ['get_overdue_invoices'],
      },
    ],
    requiresApproval: true,
  },

  // Optimize today's route
  {
    id: 'optimize_daily_route',
    name: 'Optimize Route & Preview',
    description: "Optimize today's job route and show the optimized order",
    patterns: [
      /optimize\s+(today'?s?\s+)?route\s+(and|then)\s+(show|preview|display)/i,
      /best\s+route\s+for\s+today/i,
      /minimize\s+(today'?s?\s+)?driving/i,
    ],
    keywords: ['optimize', 'route', 'today', 'driving', 'preview'],
    steps: [
      {
        name: 'Get Today\'s Jobs',
        description: 'Fetch all scheduled jobs for today',
        tool: 'get_schedule_summary',
        argMapping: () => {
          const today = new Date().toISOString().split('T')[0];
          return { startDate: today, endDate: today };
        },
      },
      {
        name: 'Optimize Route',
        description: 'Calculate optimal driving order',
        tool: 'optimize_route_for_date',
        argMapping: () => ({
          date: new Date().toISOString().split('T')[0],
        }),
        dependsOn: ['get_schedule_summary'],
      },
    ],
    requiresApproval: false,
  },

  // Weekly scheduling preparation
  {
    id: 'weekly_scheduling_prep',
    name: 'Weekly Scheduling Prep',
    description: 'Get all unscheduled jobs, check team availability, and batch schedule for the week',
    patterns: [
      /prep(are)?\s+(for\s+)?(this\s+|next\s+)?week('s)?\s+schedule/i,
      /schedule\s+(all\s+)?(jobs?\s+)?for\s+(this\s+|the\s+)?week/i,
      /weekly\s+scheduling\s+(prep|preparation)/i,
      /set\s+up\s+(this\s+|next\s+)?week('s)?\s+jobs?/i,
    ],
    keywords: ['weekly', 'schedule', 'prep', 'preparation', 'week'],
    steps: [
      {
        name: 'Get Unscheduled Jobs',
        description: 'Find all jobs waiting to be scheduled',
        tool: 'get_unscheduled_jobs',
        argMapping: () => ({}),
      },
      {
        name: 'Check Team Availability',
        description: 'Review team capacity for the week',
        tool: 'get_team_utilization',
        argMapping: () => {
          const today = new Date();
          const weekEnd = new Date(today);
          weekEnd.setDate(today.getDate() + 7);
          return { 
            startDate: today.toISOString().split('T')[0],
            endDate: weekEnd.toISOString().split('T')[0],
          };
        },
        dependsOn: ['get_unscheduled_jobs'],
      },
      {
        name: 'Batch Schedule Jobs',
        description: 'Schedule all jobs optimally for the week',
        tool: 'batch_schedule_jobs',
        argMapping: (ctx, results) => ({
          jobIds: results['get_unscheduled_jobs']?.unscheduled_jobs?.map((j: any) => j.id) || [],
        }),
        dependsOn: ['get_team_utilization'],
      },
    ],
    requiresApproval: true,
  },

  // End of day closeout
  {
    id: 'end_of_day_closeout',
    name: 'End of Day Closeout',
    description: 'Close completed jobs, generate invoices, and send them to customers',
    patterns: [
      /end\s+of\s+(the\s+)?day\s+(closeout|close\s*out|wrap\s*up)/i,
      /daily\s+(closeout|close\s*out)/i,
      /close\s+out\s+(the\s+)?day/i,
      /finish\s+(up\s+)?(the\s+)?day('s)?\s+(work|jobs?)/i,
    ],
    keywords: ['end', 'day', 'closeout', 'close', 'wrap'],
    steps: [
      {
        name: 'Get Completed Jobs',
        description: 'Find all jobs completed today',
        tool: 'get_completed_jobs',
        argMapping: () => {
          const today = new Date().toISOString().split('T')[0];
          return { dateRange: { start: today, end: today } };
        },
      },
      {
        name: 'Close Jobs',
        description: 'Mark completed jobs as closed',
        tool: 'batch_update_job_status',
        argMapping: (ctx, results) => ({
          jobIds: results['get_completed_jobs']?.jobs?.map((j: any) => j.id) || [],
          newStatus: 'Closed',
        }),
        dependsOn: ['get_completed_jobs'],
      },
      {
        name: 'Generate Invoices',
        description: 'Create invoices for closed jobs',
        tool: 'batch_create_invoices',
        argMapping: (ctx, results) => ({
          jobIds: results['batch_update_job_status']?.updatedJobIds || [],
        }),
        dependsOn: ['batch_update_job_status'],
      },
      {
        name: 'Send Invoices',
        description: 'Email invoices to customers',
        tool: 'batch_send_invoices',
        argMapping: (ctx, results) => ({
          invoiceIds: results['batch_create_invoices']?.invoiceIds || [],
        }),
        dependsOn: ['batch_create_invoices'],
      },
    ],
    requiresApproval: true,
  },

  // Customer onboarding
  {
    id: 'customer_onboarding',
    name: 'Customer Onboarding',
    description: 'Create a new customer, generate a quote, and send it for approval',
    patterns: [
      /onboard\s+(a\s+)?(new\s+)?customer/i,
      /new\s+customer\s+setup/i,
      /add\s+(a\s+)?customer\s+and\s+(create|send)\s+(a\s+)?quote/i,
      /create\s+customer\s+and\s+quote/i,
    ],
    keywords: ['onboard', 'customer', 'new', 'setup', 'quote'],
    steps: [
      {
        name: 'Create Customer',
        description: 'Add the new customer to the system',
        tool: 'create_customer',
        argMapping: (ctx) => ({
          // Support both naming conventions (customerName or name)
          name: ctx.entities?.customerName || ctx.entities?.name,
          email: ctx.entities?.customerEmail || ctx.entities?.email,
          phone: ctx.entities?.customerPhone || ctx.entities?.phone,
          address: ctx.entities?.customerAddress || ctx.entities?.address,
        }),
      },
      {
        name: 'Create Quote',
        description: 'Generate a quote for the customer',
        tool: 'create_quote',
        argMapping: (ctx, results) => ({
          customerId: results['create_customer']?.customer_id,
          items: ctx.entities?.quoteItems || [],
          notes: ctx.entities?.notes,
        }),
        dependsOn: ['create_customer'],
      },
      {
        name: 'Send Quote',
        description: 'Email the quote to the customer',
        tool: 'send_quote',
        argMapping: (ctx, results) => ({
          quoteId: results['create_quote']?.quote_id,
        }),
        dependsOn: ['create_quote'],
      },
    ],
    requiresApproval: true,
  },

  // Complete lead generation workflow
  {
    id: 'complete_lead_generation',
    name: 'Complete Lead Generation',
    description: 'Capture a new lead, check for duplicates, create service request, and optionally assign to team',
    specialCardType: 'lead_workflow', // Use LeadWorkflowCard for this pattern
    patterns: [
      /new\s+lead\s+(from|via|through)/i,
      /add\s+(a\s+)?(new\s+)?customer\s+(and|then)\s+(create|assign)/i,
      /customer\s+inquiry\s+(from|about)/i,
      /create\s+(new\s+)?lead\s+for/i,
      /capture\s+(new\s+)?lead/i,
      /log\s+(a\s+)?(new\s+)?(customer|lead)\s+request/i,
    ],
    keywords: ['new lead', 'customer inquiry', 'add customer', 'capture lead', 'service request'],
    steps: [
      {
        name: 'Check for Existing Customer',
        description: 'Search for duplicate customers by email or phone',
        tool: 'search_customers',
        argMapping: (ctx) => ({ 
          query: ctx.entities?.email || ctx.entities?.phone || ctx.entities?.name 
        }),
      },
      {
        name: 'Create Customer Record',
        description: 'Create new customer if not found',
        tool: 'create_customer',
        argMapping: (ctx) => ({
          name: ctx.entities?.customerName || ctx.entities?.name,
          email: ctx.entities?.customerEmail || ctx.entities?.email,
          phone: ctx.entities?.customerPhone || ctx.entities?.phone,
          address: ctx.entities?.customerAddress || ctx.entities?.address,
        }),
        dependsOn: ['search_customers'],
      },
      {
        name: 'Create Service Request',
        description: 'Log the service request details',
        tool: 'create_request',
        argMapping: (ctx, results) => ({
          customerId: results['create_customer']?.customer_id,
          title: ctx.entities?.serviceNeed || ctx.entities?.title || 'New inquiry',
          serviceDetails: ctx.entities?.details || ctx.entities?.notes,
          source: ctx.entities?.source || 'chat',
        }),
        dependsOn: ['create_customer'],
      },
      {
        name: 'Score Lead',
        description: 'Calculate lead quality score based on data completeness',
        tool: 'score_lead',
        argMapping: (ctx, results) => ({
          customerId: results['create_customer']?.customer_id,
        }),
        dependsOn: ['create_customer'],
      },
      {
        name: 'Check Team Availability',
        description: 'Find available team members for assignment',
        tool: 'check_team_availability',
        argMapping: () => ({
          date: new Date().toISOString().split('T')[0],
        }),
        dependsOn: ['create_request'],
        optional: true,
      },
      {
        name: 'Auto-Assign Lead',
        description: 'Assign to team member with lowest workload',
        tool: 'auto_assign_lead',
        argMapping: (ctx, results) => ({
          customerId: results['create_customer']?.customer_id,
        }),
        dependsOn: ['check_team_availability'],
        optional: true,
      },
      {
        name: 'Create Initial Quote',
        description: 'Create a quote for the new lead',
        tool: 'create_quote',
        argMapping: (ctx, results) => ({
          customerId: results['create_customer']?.customer_id,
          lineItems: ctx.entities?.quoteItems || [],
        }),
        dependsOn: ['create_customer'],
        optional: true,
      },
      {
        name: 'Send Welcome Email',
        description: 'Send welcome email to new customer',
        tool: 'send_email',
        argMapping: (ctx, results) => ({
          customerId: results['create_customer']?.customer_id,
          subject: `Welcome to ${ctx.businessName || 'our service'}!`,
          body: `<p>Hi ${ctx.entities?.customerName || ctx.entities?.name || 'there'},</p>
<p>Thank you for reaching out! We've received your inquiry and a member of our team will be in touch shortly.</p>
<p>In the meantime, if you have any questions, feel free to reply to this email.</p>
<p>Best regards,<br>The Team</p>`,
          emailType: 'welcome',
        }),
        dependsOn: ['create_customer'],
        optional: true,
      },
    ],
    requiresApproval: true,
  },

  // Complete site assessment workflow
  {
    id: 'complete_site_assessment',
    name: 'Complete Site Assessment',
    description: 'Schedule and conduct a full site assessment with documentation and reporting',
    specialCardType: 'assessment_workflow', // Use AssessmentWorkflowCard for this pattern
    patterns: [
      /site\s+assessment\s+(for|at)/i,
      /schedule\s+(a\s+)?(site\s+)?assessment/i,
      /conduct\s+(a\s+)?site\s+(visit|assessment|inspection)/i,
      /assessment\s+for\s+.+\s+property/i,
      /property\s+assessment\s+(for|at)/i,
      /on-?site\s+(evaluation|inspection)/i,
    ],
    keywords: ['site assessment', 'property assessment', 'site visit', 'inspection', 'assessment'],
    steps: [
      {
        name: 'Check for Existing Customer',
        description: 'Search for customer record',
        tool: 'search_customers',
        argMapping: (ctx) => ({ 
          query: ctx.entities?.email || ctx.entities?.phone || ctx.entities?.name 
        }),
      },
      {
        name: 'Create Customer Record',
        description: 'Create new customer if not found',
        tool: 'create_customer',
        argMapping: (ctx) => ({
          name: ctx.entities?.customerName || ctx.entities?.name,
          email: ctx.entities?.customerEmail || ctx.entities?.email,
          phone: ctx.entities?.customerPhone || ctx.entities?.phone,
          address: ctx.entities?.customerAddress || ctx.entities?.address,
        }),
        dependsOn: ['search_customers'],
        optional: true,
      },
      {
        name: 'Create Assessment Request',
        description: 'Log assessment request in system',
        tool: 'create_request',
        argMapping: (ctx, results) => ({
          customerId: results['create_customer']?.customer_id || results['search_customers']?.customers?.[0]?.id,
          title: ctx.entities?.title || 'Site Assessment',
          serviceDetails: ctx.entities?.details || 'On-site assessment requested',
          source: ctx.entities?.source || 'chat',
        }),
        dependsOn: ['search_customers'],
      },
      {
        name: 'Check Team Availability',
        description: 'Find available assessors',
        tool: 'check_team_availability',
        argMapping: (ctx) => ({
          date: ctx.entities?.preferredDate || new Date().toISOString().split('T')[0],
        }),
        dependsOn: ['create_request'],
      },
      {
        name: 'Create Assessment Job',
        description: 'Schedule assessment job',
        tool: 'create_assessment_job',
        argMapping: (ctx, results) => ({
          customerId: results['create_customer']?.customer_id || results['search_customers']?.customers?.[0]?.id,
          address: ctx.entities?.address || ctx.entities?.customerAddress,
          title: ctx.entities?.title || 'Site Assessment',
          starts_at: ctx.entities?.starts_at || ctx.entities?.preferredDate,
          notes: ctx.entities?.access_instructions || ctx.entities?.notes,
          request_id: results['create_request']?.request_id,
        }),
        dependsOn: ['check_team_availability'],
      },
      {
        name: 'Assign Assessor',
        description: 'Assign team member to assessment',
        tool: 'assign_job',
        argMapping: (ctx, results) => ({
          jobId: results['create_assessment_job']?.job_id,
          userId: ctx.entities?.assigned_to || results['check_team_availability']?.availableMembers?.[0]?.id,
        }),
        dependsOn: ['create_assessment_job'],
        optional: true,
      },
      {
        name: 'Send Confirmation',
        description: 'Send confirmation to customer',
        tool: 'send_job_confirmation',
        argMapping: (ctx, results) => ({
          jobId: results['create_assessment_job']?.job_id,
        }),
        dependsOn: ['create_assessment_job'],
        optional: true,
      },
    ],
    requiresApproval: true,
  },

  // Complete customer communication workflow
  {
    id: 'complete_customer_communication',
    name: 'Customer Communication',
    description: 'Start a conversation with a customer, send messages, and optionally schedule follow-ups',
    specialCardType: 'communication_workflow',
    patterns: [
      /contact\s+(the\s+)?customer/i,
      /start\s+(a\s+)?conversation\s+(with|for)/i,
      /message\s+(the\s+)?customer/i,
      /reach\s+out\s+to/i,
      /follow\s+up\s+with/i,
      /send\s+(a\s+)?message\s+to/i,
      /communicate\s+with/i,
    ],
    keywords: ['contact', 'message', 'conversation', 'communicate', 'reach out', 'follow up'],
    steps: [
      {
        name: 'Get Customer Details',
        description: 'Retrieve customer information',
        tool: 'get_customer',
        argMapping: (ctx) => ({
          customerId: ctx.entities?.customerId || ctx.entities?.customer_id,
        }),
      },
      {
        name: 'Get or Create Conversation',
        description: 'Find existing conversation or create new one',
        tool: 'get_or_create_conversation',
        argMapping: (ctx, results) => ({
          customerId: results['get_customer']?.id || ctx.entities?.customerId,
        }),
        dependsOn: ['get_customer'],
      },
      {
        name: 'Send Message',
        description: 'Send initial message to customer',
        tool: 'send_message',
        argMapping: (ctx, results) => ({
          conversationId: results['get_or_create_conversation']?.conversation_id,
          content: ctx.entities?.messageContent || 'Hello! Thank you for reaching out. How can we help you today?',
          senderType: 'business',
        }),
        dependsOn: ['get_or_create_conversation'],
      },
      {
        name: 'Send Email Notification',
        description: 'Optionally send email notification',
        tool: 'send_email',
        argMapping: (ctx, results) => ({
          customerId: results['get_customer']?.id,
          emailType: 'message_notification',
          subject: ctx.entities?.emailSubject || 'New message from our team',
        }),
        dependsOn: ['send_message'],
        optional: true,
      },
    ],
    requiresApproval: false,
  },

  {
    id: 'quote_to_job_complete',
    name: 'Quote to Scheduled Job',
    description: 'Approve quote, create job, assign checklist, assign team, and auto-schedule',
    patterns: [
      /quote\s+to\s+(scheduled\s+)?job\s+(full|complete|workflow)/i,
      /approve\s+and\s+schedule\s+(the\s+)?quote/i,
      /convert\s+quote\s+to\s+scheduled\s+job/i,
      /full\s+quote\s+(to\s+)?job\s+conversion/i,
    ],
    keywords: ['quote', 'job', 'schedule', 'approve', 'complete', 'full'],
    steps: [
      {
        name: 'Approve Quote',
        description: 'Mark the quote as approved',
        tool: 'approve_quote',
        argMapping: (ctx) => ({
          quoteId: ctx.entities?.quoteId,
        }),
      },
      {
        name: 'Create Job',
        description: 'Convert quote to work order',
        tool: 'convert_quote_to_job',
        argMapping: (ctx, results) => ({
          quoteId: results['approve_quote']?.quote_id || ctx.entities?.quoteId,
        }),
        dependsOn: ['approve_quote'],
      },
      {
        name: 'Assign Checklist',
        description: 'Attach checklist template to job',
        tool: 'assign_checklist_to_job',
        argMapping: (ctx, results) => ({
          jobId: results['convert_quote_to_job']?.job_id,
          templateId: ctx.entities?.checklistTemplateId || 'default',
        }),
        dependsOn: ['convert_quote_to_job'],
        optional: true,
      },
      {
        name: 'Assign Team',
        description: 'Assign team member to the job',
        tool: 'assign_job_to_member',
        argMapping: (ctx, results) => ({
          jobId: results['convert_quote_to_job']?.job_id,
          userId: ctx.entities?.assigneeId,
        }),
        dependsOn: ['convert_quote_to_job'],
        optional: true,
      },
      {
        name: 'Schedule Job',
        description: 'Auto-schedule the job',
        tool: 'schedule_job',
        argMapping: (ctx, results) => ({
          jobId: results['convert_quote_to_job']?.job_id,
        }),
        dependsOn: ['convert_quote_to_job'],
      },
    ],
    requiresApproval: true,
  },

  // Overdue invoice follow-up
  {
    id: 'overdue_follow_up',
    name: 'Overdue Invoice Follow-up',
    description: 'Find overdue invoices, send payment reminders, and log follow-up activity',
    patterns: [
      /follow\s*up\s+(on\s+)?(all\s+)?overdue\s+invoices?/i,
      /chase\s+(up\s+)?(all\s+)?overdue\s+(invoices?|payments?)/i,
      /collect\s+(on\s+)?overdue\s+(invoices?|payments?)/i,
      /overdue\s+(invoice\s+)?follow\s*up/i,
    ],
    keywords: ['overdue', 'follow', 'up', 'chase', 'collect', 'payment'],
    steps: [
      {
        name: 'Get Overdue Invoices',
        description: 'Find all invoices past due date',
        tool: 'get_overdue_invoices',
        argMapping: () => ({}),
      },
      {
        name: 'Send Reminders',
        description: 'Email payment reminders to customers',
        tool: 'batch_send_reminders',
        argMapping: (ctx, results) => ({
          invoiceIds: results['get_overdue_invoices']?.invoices?.map((i: any) => i.id) || [],
        }),
        dependsOn: ['get_overdue_invoices'],
      },
      {
        name: 'Log Activity',
        description: 'Record follow-up activity in system',
        tool: 'log_activity',
        argMapping: (ctx, results) => ({
          activityType: 'payment_reminder',
          description: `Sent ${results['batch_send_reminders']?.sentCount || 0} payment reminders`,
          metadata: {
            invoiceIds: results['get_overdue_invoices']?.invoices?.map((i: any) => i.id) || [],
          },
        }),
        dependsOn: ['batch_send_reminders'],
      },
    ],
    requiresApproval: true,
  },

  // Team schedule overview
  {
    id: 'team_schedule_overview',
    name: 'Team Schedule Overview',
    description: 'Get team utilization, check active clock-ins, and generate a summary',
    patterns: [
      /team\s+(schedule\s+)?(overview|summary|status)/i,
      /what('s|\s+is)\s+(the\s+)?team\s+(doing|working\s+on)/i,
      /show\s+(me\s+)?(the\s+)?team('s)?\s+(schedule|status)/i,
      /team\s+utilization\s+(report|summary)/i,
    ],
    keywords: ['team', 'schedule', 'overview', 'utilization', 'summary'],
    steps: [
      {
        name: 'Get Team Utilization',
        description: 'Review team workload and capacity',
        tool: 'get_team_utilization',
        argMapping: () => {
          const today = new Date();
          const weekEnd = new Date(today);
          weekEnd.setDate(today.getDate() + 7);
          return { 
            startDate: today.toISOString().split('T')[0],
            endDate: weekEnd.toISOString().split('T')[0],
          };
        },
      },
      {
        name: 'Get Active Clock-ins',
        description: 'Check who is currently clocked in',
        tool: 'get_active_clockins',
        argMapping: () => ({}),
        dependsOn: ['get_team_utilization'],
      },
      {
        name: 'Generate Summary',
        description: 'Create a team status summary',
        tool: 'generate_team_summary',
        argMapping: (ctx, results) => ({
          utilization: results['get_team_utilization'],
          activeClockIns: results['get_active_clockins'],
        }),
        dependsOn: ['get_active_clockins'],
      },
    ],
    requiresApproval: false,
  },

  // Capacity planning
  {
    id: 'capacity_planning',
    name: 'Capacity Planning',
    description: 'Analyze capacity forecast, check for conflicts, and suggest optimizations',
    patterns: [
      /capacity\s+(planning|analysis|forecast)/i,
      /check\s+(our\s+)?capacity\s+for\s+(next\s+)?week/i,
      /can\s+we\s+take\s+(on\s+)?more\s+(work|jobs?)/i,
      /workload\s+forecast/i,
    ],
    keywords: ['capacity', 'planning', 'forecast', 'workload', 'availability'],
    steps: [
      {
        name: 'Get Capacity Forecast',
        description: 'Analyze upcoming workload vs availability',
        tool: 'get_capacity_forecast',
        argMapping: () => {
          const today = new Date();
          const twoWeeksOut = new Date(today);
          twoWeeksOut.setDate(today.getDate() + 14);
          return { 
            startDate: today.toISOString().split('T')[0],
            endDate: twoWeeksOut.toISOString().split('T')[0],
          };
        },
      },
      {
        name: 'Check Conflicts',
        description: 'Identify scheduling conflicts',
        tool: 'check_scheduling_conflicts',
        argMapping: () => {
          const today = new Date();
          const twoWeeksOut = new Date(today);
          twoWeeksOut.setDate(today.getDate() + 14);
          return { 
            startDate: today.toISOString().split('T')[0],
            endDate: twoWeeksOut.toISOString().split('T')[0],
          };
        },
        dependsOn: ['get_capacity_forecast'],
      },
      {
        name: 'Suggest Optimizations',
        description: 'Generate recommendations for better capacity usage',
        tool: 'suggest_capacity_optimizations',
        argMapping: (ctx, results) => ({
          forecast: results['get_capacity_forecast'],
          conflicts: results['check_scheduling_conflicts'],
        }),
        dependsOn: ['check_scheduling_conflicts'],
      },
    ],
    requiresApproval: false,
  },

  // Batch reschedule
  {
    id: 'batch_reschedule',
    name: 'Batch Reschedule',
    description: 'Find scheduling conflicts, reschedule conflicting jobs, and notify affected customers',
    patterns: [
      /batch\s+reschedule/i,
      /fix\s+(all\s+)?scheduling\s+conflicts?/i,
      /resolve\s+(all\s+)?conflicts?\s+(and\s+)?notify/i,
      /reschedule\s+(all\s+)?conflicting\s+jobs?/i,
    ],
    keywords: ['batch', 'reschedule', 'conflicts', 'fix', 'resolve'],
    steps: [
      {
        name: 'Get Scheduling Conflicts',
        description: 'Find all jobs with scheduling conflicts',
        tool: 'check_scheduling_conflicts',
        argMapping: () => {
          const today = new Date();
          const weekEnd = new Date(today);
          weekEnd.setDate(today.getDate() + 7);
          return { 
            startDate: today.toISOString().split('T')[0],
            endDate: weekEnd.toISOString().split('T')[0],
          };
        },
      },
      {
        name: 'Reschedule Jobs',
        description: 'Automatically reschedule conflicting jobs',
        tool: 'batch_reschedule_jobs',
        argMapping: (ctx, results) => ({
          jobIds: results['check_scheduling_conflicts']?.conflictingJobIds || [],
        }),
        dependsOn: ['check_scheduling_conflicts'],
      },
      {
        name: 'Notify Customers',
        description: 'Send rescheduling notifications to affected customers',
        tool: 'send_job_confirmations',
        argMapping: (ctx, results) => ({
          jobIds: results['batch_reschedule_jobs']?.rescheduledJobIds || [],
          reason: 'reschedule',
        }),
        dependsOn: ['batch_reschedule_jobs'],
      },
    ],
    requiresApproval: true,
  },

  // Invoice batch send
  {
    id: 'invoice_batch_send',
    name: 'Invoice Batch Send',
    description: 'Find unpaid invoices and send batch reminders',
    patterns: [
      /send\s+(all\s+)?unpaid\s+invoice\s+reminders?/i,
      /batch\s+send\s+invoice\s+reminders?/i,
      /remind\s+(all\s+)?unpaid\s+customers?/i,
      /invoice\s+batch\s+send/i,
    ],
    keywords: ['invoice', 'batch', 'send', 'unpaid', 'reminders'],
    steps: [
      {
        name: 'Get Unpaid Invoices',
        description: 'Find all invoices awaiting payment',
        tool: 'get_unpaid_invoices',
        argMapping: () => ({}),
      },
      {
        name: 'Send Reminders',
        description: 'Email payment reminders',
        tool: 'batch_send_reminders',
        argMapping: (ctx, results) => ({
          invoiceIds: results['get_unpaid_invoices']?.invoices?.map((i: any) => i.id) || [],
        }),
        dependsOn: ['get_unpaid_invoices'],
      },
      {
        name: 'Record Activity',
        description: 'Log reminder activity',
        tool: 'log_activity',
        argMapping: (ctx, results) => ({
          activityType: 'invoice_reminder_batch',
          description: `Sent ${results['batch_send_reminders']?.sentCount || 0} invoice reminders`,
          metadata: {
            invoiceCount: results['get_unpaid_invoices']?.invoices?.length || 0,
          },
        }),
        dependsOn: ['batch_send_reminders'],
      },
    ],
    requiresApproval: true,
  },
];

// =============================================================================
// RECOVERY ACTIONS - Define what actions can resolve failed steps
// =============================================================================

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  tool?: string;
  resumeFromStep: boolean;
  // For navigation-based recovery actions
  navigateTo?: string;
  // For conversational recovery - query tool to fetch options
  queryTool?: string;
  // The entity type this resolves (e.g., 'quoteId', 'jobId')
  resolvesEntity?: string;
  // Prompt to ask the user when presenting options
  clarificationPrompt?: string;
}

// Map of tool names to available recovery actions
const RECOVERY_ACTIONS: Record<string, RecoveryAction[]> = {
  // Communication-related recovery actions
  'get_or_create_conversation': [
    {
      id: 'select_customer',
      label: 'Select a customer',
      description: 'Choose which customer to contact',
      resumeFromStep: true,
      queryTool: 'search_customers',
      resolvesEntity: 'customerId',
      clarificationPrompt: 'Which customer would you like to contact?',
    },
  ],
  'send_message': [
    {
      id: 'view_conversations',
      label: 'View conversations',
      description: 'Check existing conversations',
      navigateTo: '/team?tab=conversations',
      resumeFromStep: true,
    },
  ],
  'get_unscheduled_jobs': [
    {
      id: 'create_job',
      label: 'Create a job',
      description: 'Add a new job to schedule',
      navigateTo: '/work-orders',
      resumeFromStep: true,
    },
  ],
  'batch_schedule_jobs': [
    {
      id: 'create_jobs',
      label: 'Create some jobs first',
      description: 'Add jobs before scheduling',
      navigateTo: '/work-orders',
      resumeFromStep: true,
    },
  ],
  'get_completed_jobs': [
    {
      id: 'view_jobs',
      label: 'View all jobs',
      description: 'Check job statuses',
      navigateTo: '/work-orders',
      resumeFromStep: true,
    },
  ],
  'get_overdue_invoices': [
    {
      id: 'view_invoices',
      label: 'View invoices',
      description: 'Check invoice statuses',
      navigateTo: '/invoices',
      resumeFromStep: true,
    },
  ],
  'get_unpaid_invoices': [
    {
      id: 'create_invoice',
      label: 'Create an invoice',
      description: 'Generate a new invoice',
      navigateTo: '/invoices',
      resumeFromStep: true,
    },
  ],
  // Quote-related recovery actions
  'approve_quote': [
    {
      id: 'select_quote',
      label: 'Select a quote',
      description: 'Choose which quote to approve',
      resumeFromStep: true,
      queryTool: 'list_pending_quotes',
      resolvesEntity: 'quoteId',
      clarificationPrompt: 'Which quote would you like me to approve?',
    },
    {
      id: 'view_quotes',
      label: 'View quotes',
      description: 'Find and select a quote to approve',
      navigateTo: '/quotes',
      resumeFromStep: true,
    },
    {
      id: 'create_quote',
      label: 'Create a quote',
      description: 'Create a new quote first',
      navigateTo: '/quotes?new=1',
      resumeFromStep: true,
    },
  ],
  'get_quote': [
    {
      id: 'view_quotes',
      label: 'View quotes',
      description: 'Browse existing quotes',
      navigateTo: '/quotes',
      resumeFromStep: true,
    },
  ],
  'convert_quote_to_job': [
    {
      id: 'select_quote',
      label: 'Select a quote',
      description: 'Choose which quote to convert',
      resumeFromStep: true,
      queryTool: 'list_approved_quotes',
      resolvesEntity: 'quoteId',
      clarificationPrompt: 'Which approved quote would you like to convert to a job?',
    },
    {
      id: 'view_quotes',
      label: 'View quotes',
      description: 'Select a different quote',
      navigateTo: '/quotes',
      resumeFromStep: true,
    },
    {
      id: 'approve_quote_first',
      label: 'Approve the quote first',
      description: 'Quote must be approved before conversion',
      navigateTo: '/quotes',
      resumeFromStep: true,
    },
  ],
  // Job-related recovery actions
  'create_job_from_quote': [
    {
      id: 'view_quotes',
      label: 'View quotes',
      description: 'Select a different quote',
      navigateTo: '/quotes',
      resumeFromStep: true,
    },
  ],
  'schedule_job': [
    {
      id: 'view_calendar',
      label: 'Open calendar',
      description: 'Schedule the job manually',
      navigateTo: '/calendar',
      resumeFromStep: true,
    },
  ],
  'assign_job_to_member': [
    {
      id: 'view_team',
      label: 'View team',
      description: 'Check team availability',
      navigateTo: '/team',
      resumeFromStep: true,
    },
  ],
  // Invoice-related recovery actions
  'create_invoice': [
    {
      id: 'select_job',
      label: 'Select a job',
      description: 'Choose which job to invoice',
      resumeFromStep: true,
      queryTool: 'list_completed_jobs',
      resolvesEntity: 'jobId',
      clarificationPrompt: 'Which completed job would you like me to create an invoice for?',
    },
    {
      id: 'view_jobs',
      label: 'View jobs',
      description: 'Select a job to invoice',
      navigateTo: '/work-orders',
      resumeFromStep: true,
    },
  ],
  'send_invoice': [
    {
      id: 'view_invoices',
      label: 'View invoices',
      description: 'Check invoice status',
      navigateTo: '/invoices',
      resumeFromStep: true,
    },
  ],
  // Customer-related recovery actions
  'create_customer': [
    {
      id: 'view_customers',
      label: 'View customers',
      description: 'Check if customer already exists',
      navigateTo: '/customers',
      resumeFromStep: true,
    },
  ],
  // Empty arrays for tools that don't have sensible recovery actions
  'check_scheduling_conflicts': [],
  'get_team_utilization': [],
  'log_activity': [],
};

// Get recovery actions for a failed tool
export function getRecoveryActionsForTool(toolName: string): RecoveryAction[] {
  return RECOVERY_ACTIONS[toolName] || [];
}

// =============================================================================
// ROLLBACK OPERATIONS
// =============================================================================

const ROLLBACK_OPERATIONS: Record<string, { tool: string; argBuilder: (stepResult: any) => Record<string, any> } | null> = {
  'batch_schedule_jobs': {
    tool: 'unschedule_jobs',
    argBuilder: (result) => ({
      jobIds: result?.scheduledJobs?.map((j: any) => j.jobId) || [],
    }),
  },
  'create_invoice': {
    tool: 'void_invoice',
    argBuilder: (result) => ({
      invoiceId: result?.invoice_id,
    }),
  },
  'update_job_status': {
    tool: 'update_job_status',
    argBuilder: (result) => ({
      jobId: result?.job_id,
      newStatus: result?.previous_status || 'Scheduled',
    }),
  },
  'batch_update_job_status': {
    tool: 'batch_update_job_status',
    argBuilder: (result) => ({
      jobIds: result?.updatedJobIds || [],
      newStatus: result?.previousStatus || 'Completed',
    }),
  },
  'assign_job_to_member': {
    tool: 'unassign_job_from_member',
    argBuilder: (result) => ({
      jobId: result?.job_id,
      userId: result?.user_id,
    }),
  },
  // Can't rollback these
  'send_invoice': null,
  'send_job_confirmations': null,
  'batch_send_reminders': null,
  'approve_quote': null, // Could potentially unapprove but risky
};

// =============================================================================
// TASK DECOMPOSITION
// =============================================================================

export function detectMultiStepTask(
  message: string,
  entities: Record<string, any>
): { isMultiStep: boolean; pattern?: MultiStepPattern } {
  const messageLower = message.toLowerCase();

  for (const pattern of MULTI_STEP_PATTERNS) {
    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        return { isMultiStep: true, pattern };
      }
    }

    // Check keyword combinations
    const matchedKeywords = pattern.keywords.filter(kw => 
      messageLower.includes(kw.toLowerCase())
    );
    if (matchedKeywords.length >= 2) {
      return { isMultiStep: true, pattern };
    }
  }

  return { isMultiStep: false };
}

export function buildExecutionPlan(
  pattern: MultiStepPattern,
  entities: Record<string, any>
): ExecutionPlan {
  const planId = crypto.randomUUID();
  
  const steps: PlanStep[] = pattern.steps.map((stepDef, index) => ({
    id: `step_${index + 1}_${stepDef.tool}`,
    name: stepDef.name,
    description: stepDef.description,
    tool: stepDef.tool,
    args: {}, // Will be populated during execution
    dependsOn: stepDef.dependsOn?.map(dep => {
      const depIndex = pattern.steps.findIndex(s => s.tool === dep);
      return depIndex >= 0 ? `step_${depIndex + 1}_${dep}` : dep;
    }) || [],
    status: 'pending',
  }));

  return {
    id: planId,
    name: pattern.name,
    description: pattern.description,
    steps,
    status: pattern.requiresApproval ? 'awaiting_approval' : 'planning',
    currentStepIndex: 0,
    createdAt: new Date().toISOString(),
  };
}

// =============================================================================
// PLAN EXECUTION
// =============================================================================

export async function executePlan(
  plan: ExecutionPlan,
  context: ExecutionContext,
  entities: Record<string, any>,
  pattern: MultiStepPattern,
  onProgress: (result: PlannerResult) => void
): Promise<ExecutionPlan> {
  const startTime = Date.now();
  plan.status = 'executing';
  
  const results: Record<string, any> = {};

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    plan.currentStepIndex = i;

    // Check dependencies
    const unmetDeps = step.dependsOn.filter(depId => {
      const depStep = plan.steps.find(s => s.id === depId);
      return depStep && depStep.status !== 'completed';
    });

    if (unmetDeps.length > 0) {
      // Skip if optional, fail if required
      const stepDef = pattern.steps[i];
      if (stepDef?.optional) {
        step.status = 'skipped';
        continue;
      }
      step.status = 'failed';
      step.error = `Dependencies not met: ${unmetDeps.join(', ')}`;
      plan.status = 'failed';
      onProgress({ type: 'plan_failed', plan, currentStep: step, message: step.error });
      return plan;
    }

    // Execute step
    step.status = 'running';
    step.startedAt = new Date().toISOString();
    
    onProgress({ 
      type: 'step_progress', 
      plan, 
      currentStep: step,
      message: `Running: ${step.name}`,
    });

    try {
      // Build args from pattern definition
      const stepDef = pattern.steps.find(s => s.tool === step.tool);
      if (stepDef) {
        step.args = stepDef.argMapping({ entities }, results);
      }

      // Get the tool
      const tool = context.tools[step.tool];
      if (!tool) {
        throw new Error(`Tool not found: ${step.tool}`);
      }

      // Execute with verification if contract exists
      const toolContext = {
        supabase: context.supabase,
        businessId: context.businessId,
        userId: context.userId,
        controller: context.controller,
      };

      let result: any;
      let verifiedResult: VerifiedStepResult | null = null;

      if (hasContract(step.tool)) {
        // Execute with step verification
        const stepContext: StepExecutionContext = {
          businessId: context.businessId,
          userId: context.userId,
          args: step.args,
          entities: entities,
          previousResults: results,
        };

        verifiedResult = await executeWithVerification(
          step.tool,
          () => tool.execute(step.args, toolContext),
          stepContext,
          context.supabase
        );

        // Log verification result
        await logVerificationResult(context.supabase, {
          planId: plan.id,
          stepId: step.id,
          toolName: step.tool,
          businessId: context.businessId,
          userId: context.userId,
          verificationResult: verifiedResult,
        });

        // Handle verification failure
        if (verifiedResult.status === 'failed') {
          const errorMsg = verifiedResult.error || 'Verification failed';
          const suggestion = verifiedResult.recoverySuggestion;
          
          step.status = 'failed';
          step.error = suggestion ? `${errorMsg} ${suggestion}` : errorMsg;
          step.result = {
            _verification: {
              phase: verifiedResult.verification.phase,
              failedAssertions: verifiedResult.verification.failedAssertions,
              suggestion: suggestion,
            },
          };
          step.completedAt = new Date().toISOString();

          throw new Error(step.error);
        }

        result = verifiedResult.result;
      } else {
        // Execute without verification
        result = await tool.execute(step.args, toolContext);
      }
      
      step.result = result;
      step.status = 'completed';
      step.completedAt = new Date().toISOString();
      
      // Store result for dependent steps
      results[step.tool] = result;

      // Include verification info in progress message if available
      const verificationNote = verifiedResult?.verification.passed 
        ? ' (verified)' 
        : '';

      onProgress({
        type: 'step_complete',
        plan,
        currentStep: step,
        message: `Completed: ${step.name}${verificationNote}`,
      });

    } catch (error: any) {
      console.error(`[multi-step-planner] Step ${step.id} failed:`, error);
      step.status = 'failed';
      step.error = error.message || 'Unknown error';
      step.completedAt = new Date().toISOString();

      // Check if recovery actions are available for this tool
      const recoveryActions = getRecoveryActionsForTool(step.tool);
      
      if (recoveryActions.length > 0) {
        // Pause for recovery instead of rolling back
        console.info(`[multi-step-planner] Recovery actions available for ${step.tool}, pausing for recovery`);
        
        // Create memory context for pause operation
        const memoryContext: MemoryContext = {
          supabase: context.supabase,
          businessId: context.businessId,
          userId: context.userId,
        };
        
        await pausePlanForRecovery(plan, i, memoryContext);
        
        onProgress({
          type: 'plan_failed',
          plan,
          currentStep: step,
          message: `Failed at step "${step.name}": ${step.error}. Recovery options available.`,
        });
        
        return plan;
      }
      
      // No recovery available - proceed with rollback
      plan.status = 'failed';
      await rollbackPlan(plan, i, context, pattern);

      onProgress({
        type: 'plan_failed',
        plan,
        currentStep: step,
        message: `Failed at step "${step.name}": ${step.error}`,
      });

      return plan;
    }
  }

  // All steps completed
  plan.status = 'completed';
  plan.completedAt = new Date().toISOString();
  plan.totalDurationMs = Date.now() - startTime;

  onProgress({
    type: 'plan_complete',
    plan,
    message: `Plan completed successfully in ${Math.round(plan.totalDurationMs / 1000)}s`,
  });

  return plan;
}

// =============================================================================
// ROLLBACK
// =============================================================================

async function rollbackPlan(
  plan: ExecutionPlan,
  failedStepIndex: number,
  context: ExecutionContext,
  pattern: MultiStepPattern
): Promise<void> {
  console.info('[multi-step-planner] Starting rollback from step', failedStepIndex);
  plan.rollbackSteps = [];

  // Rollback in reverse order
  for (let i = failedStepIndex - 1; i >= 0; i--) {
    const step = plan.steps[i];
    
    if (step.status !== 'completed') continue;

    const rollbackOp = ROLLBACK_OPERATIONS[step.tool];
    
    if (!rollbackOp) {
      console.info(`[multi-step-planner] No rollback available for ${step.tool}`);
      continue;
    }

    try {
      const rollbackTool = context.tools[rollbackOp.tool];
      if (!rollbackTool) {
        console.warn(`[multi-step-planner] Rollback tool not found: ${rollbackOp.tool}`);
        continue;
      }

      const rollbackArgs = rollbackOp.argBuilder(step.result);
      
      const rollbackStep: PlanStep = {
        id: `rollback_${step.id}`,
        name: `Rollback: ${step.name}`,
        description: `Reverting ${step.name}`,
        tool: rollbackOp.tool,
        args: rollbackArgs,
        dependsOn: [],
        status: 'running',
        startedAt: new Date().toISOString(),
      };

      const toolContext = {
        supabase: context.supabase,
        businessId: context.businessId,
        userId: context.userId,
      };

      await rollbackTool.execute(rollbackArgs, toolContext);
      
      rollbackStep.status = 'completed';
      rollbackStep.completedAt = new Date().toISOString();
      step.status = 'rolled_back';
      
      plan.rollbackSteps.push(rollbackStep);
      
      console.info(`[multi-step-planner] Rolled back step ${step.id}`);
    } catch (error: any) {
      console.error(`[multi-step-planner] Rollback failed for step ${step.id}:`, error);
      // Continue with other rollbacks
    }
  }

  if (plan.rollbackSteps.length > 0) {
    plan.status = 'rolled_back';
  }
}

// =============================================================================
// SSE HELPERS
// =============================================================================

export function sendPlanPreview(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan
): void {
  if (!controller) {
    console.warn('[multi-step-planner] sendPlanPreview called without controller');
    return;
  }
  const encoder = new TextEncoder();
  const event = {
    type: 'plan_preview',
    plan: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      steps: plan.steps.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        tool: s.tool,
        status: s.status,
      })),
      requiresApproval: plan.status === 'awaiting_approval',
    },
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export function sendStepProgress(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan,
  step: PlanStep,
  message?: string
): void {
  if (!controller) {
    console.warn('[multi-step-planner] sendStepProgress called without controller');
    return;
  }
  const encoder = new TextEncoder();
  const event = {
    type: 'step_progress',
    planId: plan.id,
    planName: plan.name,
    stepIndex: plan.currentStepIndex,
    totalSteps: plan.steps.length,
    startedAt: plan.createdAt, // Include plan start time for elapsed timer
    step: {
      id: step.id,
      name: step.name,
      tool: step.tool, // Include tool name for visibility toggle
      status: step.status,
      result: step.result,
      error: step.error,
    },
    // Include ALL steps with their current statuses for full UI state
    steps: plan.steps.map(s => ({
      id: s.id,
      name: s.name,
      tool: s.tool,
      status: s.status,
      error: s.error,
    })),
    message,
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export function sendPlanComplete(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan,
  failedStep?: PlanStep,
  entitySelectionOptions?: {
    question: string;
    resolvesEntity: string;
    options: Array<{ id: string; label: string; value: string; metadata?: any }>;
  }
): void {
  if (!controller) {
    console.warn('[multi-step-planner] sendPlanComplete called without controller');
    return;
  }
  const encoder = new TextEncoder();
  const successfulSteps = plan.steps.filter(s => s.status === 'completed').length;
  const failedSteps = plan.steps.filter(s => s.status === 'failed').length;
  
  // Get recovery actions for the failed step (include awaiting_recovery status)
  let recoveryActions: { id: string; label: string; description: string; navigateTo?: string; isConversational?: boolean }[] | undefined;
  if (failedStep && (plan.status === 'failed' || plan.status === 'awaiting_recovery')) {
    const actions = getRecoveryActionsForTool(failedStep.tool);
    if (actions.length > 0) {
      // Filter out conversational actions if we're showing entity selection
      const filteredActions = entitySelectionOptions 
        ? actions.filter(a => !a.queryTool) 
        : actions;
      
      recoveryActions = filteredActions.map(a => ({
        id: a.id,
        label: a.label,
        description: a.description,
        navigateTo: a.navigateTo,
        isConversational: !!a.queryTool,
      }));
    }
  }
  
  const event = {
    type: 'plan_complete',
    planId: plan.id,
    planName: plan.name,
    status: plan.status,
    startedAt: plan.createdAt,
    pausedAtStep: plan.pausedAtStep,
    // Include final state of ALL steps
    steps: plan.steps.map(s => ({
      id: s.id,
      name: s.name,
      tool: s.tool,
      status: s.status,
      error: s.error,
    })),
    summary: {
      totalSteps: plan.steps.length,
      successfulSteps,
      failedSteps,
      skippedSteps: plan.steps.filter(s => s.status === 'skipped').length,
      rolledBackSteps: plan.rollbackSteps?.length || 0,
      durationMs: plan.totalDurationMs,
    },
    results: plan.steps
      .filter(s => s.status === 'completed')
      .map(s => ({ stepId: s.id, name: s.name, result: s.result })),
    // Recovery actions for failed plans
    recoveryActions,
    canResume: recoveryActions && recoveryActions.length > 0,
    // Entity selection for conversational recovery
    entitySelection: entitySelectionOptions,
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// Execute conversational recovery - run query tool and send entity selection options
// This sends a conversational text message followed by entity_selection event
export async function executeConversationalRecovery(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan,
  failedStep: PlanStep,
  context: ExecutionContext
): Promise<boolean> {
  console.info('[multi-step-planner] executeConversationalRecovery called for tool:', failedStep.tool);
  
  const recoveryActions = getRecoveryActionsForTool(failedStep.tool);
  console.info('[multi-step-planner] Found', recoveryActions.length, 'recovery actions');
  
  // Find the first conversational recovery action (with queryTool)
  const conversationalAction = recoveryActions.find(a => a.queryTool && a.resolvesEntity);
  
  if (!conversationalAction || !conversationalAction.queryTool) {
    console.info('[multi-step-planner] No conversational recovery action found (no queryTool/resolvesEntity)');
    return false;
  }
  
  console.info('[multi-step-planner] Executing conversational recovery with tool:', conversationalAction.queryTool);
  
  const queryTool = context.tools[conversationalAction.queryTool];
  if (!queryTool) {
    console.error('[multi-step-planner] Query tool not found in context.tools:', conversationalAction.queryTool);
    console.info('[multi-step-planner] Available tools:', Object.keys(context.tools || {}).slice(0, 20));
    return false;
  }
  
  try {
    const result = await queryTool.execute({}, {
      supabase: context.supabase,
      businessId: context.businessId,
      userId: context.userId,
    });
    
    const options = result.options || [];
    
    if (options.length === 0) {
      console.info('[multi-step-planner] No options found from query tool');
      return false;
    }
    
    console.info('[multi-step-planner] Found', options.length, 'options for entity selection');
    
    // Get a descriptive verb for the action
    const actionVerb = failedStep.tool === 'send_quote' ? 'send' : 
                       failedStep.tool === 'approve_quote' ? 'approve' :
                       failedStep.tool === 'create_invoice' ? 'create an invoice from' : 'use';
    
    // Send a conversational text message FIRST (appears as a chat bubble)
    if (controller) {
      const encoder = new TextEncoder();
      const textContent = `I found ${options.length} quote${options.length > 1 ? 's' : ''} you might be referring to. Which one would you like me to ${actionVerb}?`;
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'token',
        content: textContent,
      })}\n\n`));
    }
    
    // Then send entity_selection as a separate event (renders selection UI below the text)
    sendEntitySelection(controller, plan.id, {
      question: conversationalAction.clarificationPrompt || `Which one would you like to use?`,
      resolvesEntity: conversationalAction.resolvesEntity!,
      options: options,
    });
    
    // Also send plan status update to show "Waiting for selection..."
    sendPlanComplete(controller, plan, failedStep);
    
    return true;
  } catch (error) {
    console.error('[multi-step-planner] Failed to execute query tool:', error);
    return false;
  }
}

// Send entity selection event - separate from plan_complete for cleaner UI
export function sendEntitySelection(
  controller: ReadableStreamDefaultController | undefined,
  planId: string,
  entitySelection: {
    question: string;
    resolvesEntity: string;
    options: Array<{ id: string; label: string; value: string; metadata?: any }>;
  }
): void {
  if (!controller) {
    console.warn('[multi-step-planner] sendEntitySelection called without controller');
    return;
  }
  const encoder = new TextEncoder();
  const event = {
    type: 'entity_selection',
    planId,
    question: entitySelection.question,
    resolvesEntity: entitySelection.resolvesEntity,
    options: entitySelection.options,
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// =============================================================================
// LEAD WORKFLOW SSE HELPERS
// Maps tool names to user-friendly step names for the LeadWorkflowCard
// =============================================================================

const LEAD_WORKFLOW_STEP_MAP: Record<string, { name: string; description: string }> = {
  'search_customers': { name: 'Check for Duplicates', description: 'Searching for existing customer...' },
  'create_customer': { name: 'Create Customer', description: 'Creating new customer record...' },
  'score_lead': { name: 'Score Lead', description: 'Calculating lead quality...' },
  'create_request': { name: 'Log Request', description: 'Recording service request...' },
  'check_team_availability': { name: 'Check Availability', description: 'Finding available team...' },
  'auto_assign_lead': { name: 'Assign Lead', description: 'Assigning to team member...' },
  'send_email': { name: 'Send Welcome', description: 'Sending welcome email...' },
  'create_quote': { name: 'Create Quote', description: 'Creating initial quote...' },
};

// Extract customer data from tool results for the LeadWorkflowCard
function extractCustomerData(
  toolName: string, 
  result: any, 
  existing: Record<string, any>
): Record<string, any> {
  if (toolName === 'create_customer') {
    return {
      ...existing,
      name: result?.customer?.name || result?.name || existing.name,
      email: result?.customer?.email || result?.email || existing.email,
      phone: result?.customer?.phone || result?.phone || existing.phone,
      leadSource: result?.customer?.lead_source || result?.lead_source || existing.leadSource,
    };
  }
  if (toolName === 'score_lead') {
    return {
      ...existing,
      leadScore: result?.score ?? result?.lead_score ?? existing.leadScore,
    };
  }
  return existing;
}

// Send lead workflow start event (instead of plan_preview for lead patterns)
export function sendLeadWorkflowStart(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan,
  initialEntities: Record<string, any>
): void {
  if (!controller) return;
  
  const encoder = new TextEncoder();
  const steps = plan.steps.map(s => {
    const stepInfo = LEAD_WORKFLOW_STEP_MAP[s.tool] || { name: s.name, description: s.description };
    return {
      id: s.id,
      name: stepInfo.name,
      description: stepInfo.description,
      status: s.status === 'pending' ? 'pending' : s.status,
      tool: s.tool,
    };
  });
  
  const event = {
    type: 'lead_workflow',
    planId: plan.id,
    workflow: {
      steps,
      currentStepIndex: 0,
      customerData: {
        name: initialEntities?.customerName || initialEntities?.name,
        email: initialEntities?.customerEmail || initialEntities?.email,
        phone: initialEntities?.customerPhone || initialEntities?.phone,
        leadSource: initialEntities?.source,
      },
    },
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// Send lead workflow progress event (instead of step_progress for lead patterns)
export function sendLeadWorkflowProgress(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan,
  step: PlanStep,
  customerData: Record<string, any>,
  automationSummary?: {
    leadScored?: boolean;
    leadScore?: number;
    autoAssigned?: boolean;
    assignedTo?: string;
    emailQueued?: boolean;
    emailDelay?: number;
  }
): void {
  if (!controller) return;
  
  const encoder = new TextEncoder();
  const steps = plan.steps.map(s => {
    const stepInfo = LEAD_WORKFLOW_STEP_MAP[s.tool] || { name: s.name, description: s.description };
    return {
      id: s.id,
      name: stepInfo.name,
      description: stepInfo.description,
      status: s.status === 'running' ? 'in_progress' : s.status,
      tool: s.tool,
      result: s.result,
      error: s.error,
      // Include verification and rollback info for failed steps
      verification: s.verification,
      rollbackExecuted: s.rollbackExecuted,
      rollbackTool: s.rollbackTool,
    };
  });
  
  const event: Record<string, any> = {
    type: 'lead_workflow_progress',
    planId: plan.id,
    stepIndex: plan.currentStepIndex,
    steps,
    customerData,
  };
  
  // Include automation summary when workflow completes
  if (automationSummary) {
    event.automationSummary = automationSummary;
  }
  
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// Check if a pattern should use LeadWorkflowCard
export function isLeadWorkflowPattern(pattern: MultiStepPattern | undefined): boolean {
  return pattern?.specialCardType === 'lead_workflow';
}

// =============================================================================
// ASSESSMENT WORKFLOW SSE HELPERS
// =============================================================================

// Map assessment tool names to user-friendly step names
const ASSESSMENT_WORKFLOW_STEP_MAP: Record<string, { name: string; description: string }> = {
  'search_customers': { 
    name: 'Check Customer', 
    description: 'Search for existing customer record' 
  },
  'create_customer': { 
    name: 'Create Customer', 
    description: 'Create new customer record' 
  },
  'create_request': { 
    name: 'Log Request', 
    description: 'Log assessment request in system' 
  },
  'check_team_availability': { 
    name: 'Check Availability', 
    description: 'Find available assessors' 
  },
  'create_assessment_job': { 
    name: 'Schedule Assessment', 
    description: 'Create and schedule assessment job' 
  },
  'assign_job': { 
    name: 'Assign Assessor', 
    description: 'Assign team member to assessment' 
  },
  'send_job_confirmation': { 
    name: 'Send Confirmation', 
    description: 'Notify customer of scheduled assessment' 
  },
  'upload_media': { 
    name: 'Upload Photos', 
    description: 'Upload assessment photos' 
  },
  'tag_media': { 
    name: 'Tag Photos', 
    description: 'Add tags and annotations' 
  },
  'analyze_photo': { 
    name: 'Analyze Issues', 
    description: 'AI-assisted risk detection' 
  },
  'generate_summary': { 
    name: 'Generate Report', 
    description: 'Create assessment report' 
  },
};

// Extract assessment data from tool results for the AssessmentWorkflowCard
function extractAssessmentData(
  toolName: string, 
  result: any, 
  existing: Record<string, any>
): Record<string, any> {
  if (toolName === 'create_customer' || toolName === 'search_customers') {
    const customer = result?.customer || result?.customers?.[0];
    return {
      ...existing,
      customerName: customer?.name || existing.customerName,
      address: customer?.address || existing.address,
    };
  }
  if (toolName === 'create_assessment_job') {
    return {
      ...existing,
      scheduledDate: result?.starts_at || existing.scheduledDate,
      jobId: result?.job_id || result?.id || existing.jobId,
    };
  }
  if (toolName === 'assign_job') {
    return {
      ...existing,
      assignedTo: result?.assigned_to_name || existing.assignedTo,
    };
  }
  if (toolName === 'upload_media') {
    return {
      ...existing,
      photoCount: (existing.photoCount || 0) + (result?.count || 1),
    };
  }
  if (toolName === 'tag_media' || toolName === 'analyze_photo') {
    return {
      ...existing,
      riskCount: (existing.riskCount || 0) + (result?.risk_count || result?.risks_found || 0),
    };
  }
  return existing;
}

// Check if a pattern should use AssessmentWorkflowCard
export function isAssessmentWorkflowPattern(pattern: MultiStepPattern | undefined): boolean {
  return pattern?.specialCardType === 'assessment_workflow';
}

// Send assessment workflow start event
export function sendAssessmentWorkflowStart(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan,
  initialEntities: Record<string, any>
): void {
  if (!controller) return;
  
  const encoder = new TextEncoder();
  const steps = plan.steps.map(s => {
    const stepInfo = ASSESSMENT_WORKFLOW_STEP_MAP[s.tool] || { name: s.name, description: s.description };
    return {
      id: s.id,
      name: stepInfo.name,
      description: stepInfo.description,
      status: s.status === 'pending' ? 'pending' : s.status,
      tool: s.tool,
    };
  });
  
  const event = {
    type: 'assessment_workflow',
    planId: plan.id,
    workflow: {
      steps,
      currentStepIndex: 0,
      assessmentData: {
        customerName: initialEntities?.customerName || initialEntities?.name,
        address: initialEntities?.address || initialEntities?.customerAddress,
        scheduledDate: initialEntities?.preferredDate || initialEntities?.starts_at,
      },
    },
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// Send assessment workflow progress event
export function sendAssessmentWorkflowProgress(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan,
  step: PlanStep,
  assessmentData: Record<string, any>,
  automationSummary?: {
    checklistCreated?: boolean;
    checklistItemCount?: number;
    photosUploaded?: number;
    risksIdentified?: number;
    reportGenerated?: boolean;
    estimateCreated?: boolean;
  }
): void {
  if (!controller) return;
  
  const encoder = new TextEncoder();
  const steps = plan.steps.map(s => {
    const stepInfo = ASSESSMENT_WORKFLOW_STEP_MAP[s.tool] || { name: s.name, description: s.description };
    return {
      id: s.id,
      name: stepInfo.name,
      description: stepInfo.description,
      status: s.status === 'running' ? 'in_progress' : s.status,
      tool: s.tool,
      result: s.result,
      error: s.error,
      verification: s.verification,
      rollbackExecuted: s.rollbackExecuted,
      rollbackTool: s.rollbackTool,
    };
  });
  
  const event: Record<string, any> = {
    type: 'assessment_workflow_progress',
    planId: plan.id,
    stepIndex: plan.currentStepIndex,
    steps,
    assessmentData,
  };
  
  // Include automation summary when workflow completes
  if (automationSummary) {
    event.automationSummary = automationSummary;
  }
  
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// Fetch assessment automation summary from recent activity log entries
export async function fetchAssessmentAutomationSummary(
  supabase: any,
  businessId: string,
  jobId?: string
): Promise<{
  checklistCreated?: boolean;
  checklistItemCount?: number;
  photosUploaded?: number;
  risksIdentified?: number;
  reportGenerated?: boolean;
  estimateCreated?: boolean;
} | undefined> {
  try {
    // Query recent automation activity from past 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    
    const { data: recentActivity } = await supabase
      .from('ai_activity_log')
      .select('activity_type, description, metadata')
      .eq('business_id', businessId)
      .gte('created_at', thirtySecondsAgo)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (!recentActivity || recentActivity.length === 0) {
      return undefined;
    }
    
    const summary: {
      checklistCreated?: boolean;
      checklistItemCount?: number;
      photosUploaded?: number;
      risksIdentified?: number;
      reportGenerated?: boolean;
      estimateCreated?: boolean;
    } = {};
    
    for (const activity of recentActivity) {
      const actionType = activity.metadata?.action_type;
      
      if (actionType === 'assessment_checklist_created' && !summary.checklistCreated) {
        summary.checklistCreated = true;
        summary.checklistItemCount = activity.metadata?.item_count;
      }
      if (actionType === 'assessment_photo_uploaded') {
        summary.photosUploaded = (summary.photosUploaded || 0) + 1;
      }
      if ((actionType === 'assessment_risk_detected' || actionType === 'risk_tag_added') && !summary.risksIdentified) {
        summary.risksIdentified = (summary.risksIdentified || 0) + 1;
      }
      if (actionType === 'assessment_report_generated' && !summary.reportGenerated) {
        summary.reportGenerated = true;
      }
      if (actionType === 'estimate_created' && !summary.estimateCreated) {
        summary.estimateCreated = true;
      }
    }
    
    // Only return if we found at least one automation event
    if (summary.checklistCreated || summary.photosUploaded || summary.risksIdentified || summary.reportGenerated || summary.estimateCreated) {
      return summary;
    }
    
    return undefined;
  } catch (error) {
    console.error('[multi-step-planner] Failed to fetch assessment automation summary:', error);
    return undefined;
  }
}

// Fetch automation summary from recent activity log entries
export async function fetchAutomationSummary(
  supabase: any,
  businessId: string,
  customerId?: string
): Promise<{
  leadScored?: boolean;
  leadScore?: number;
  autoAssigned?: boolean;
  assignedTo?: string;
  emailQueued?: boolean;
  emailDelay?: number;
} | undefined> {
  try {
    // Query recent automation activity from past 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    
    const { data: recentActivity } = await supabase
      .from('ai_activity_log')
      .select('activity_type, description, metadata')
      .eq('business_id', businessId)
      .gte('created_at', thirtySecondsAgo)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!recentActivity || recentActivity.length === 0) {
      return undefined;
    }
    
    const summary: {
      leadScored?: boolean;
      leadScore?: number;
      autoAssigned?: boolean;
      assignedTo?: string;
      emailQueued?: boolean;
      emailDelay?: number;
    } = {};
    
    for (const activity of recentActivity) {
      const actionType = activity.metadata?.action_type;
      
      if (actionType === 'lead_scored' && !summary.leadScored) {
        summary.leadScored = true;
        summary.leadScore = activity.metadata?.score;
      }
      if (actionType === 'lead_assigned' && !summary.autoAssigned) {
        summary.autoAssigned = true;
        summary.assignedTo = activity.metadata?.assigned_to_name;
      }
      if (actionType === 'email_queued' && !summary.emailQueued) {
        summary.emailQueued = true;
        summary.emailDelay = activity.metadata?.delay_minutes;
      }
    }
    
    // Only return if we found at least one automation event
    if (summary.leadScored || summary.autoAssigned || summary.emailQueued) {
      return summary;
    }
    
    return undefined;
  } catch (error) {
    console.error('[multi-step-planner] Failed to fetch automation summary:', error);
    return undefined;
  }
}

// Export extractCustomerData for use in executePlan
export { extractCustomerData };

// =============================================================================
// COMMUNICATION WORKFLOW SSE HELPERS
// =============================================================================

// Map communication tool names to user-friendly step names
const COMMUNICATION_WORKFLOW_STEP_MAP: Record<string, { name: string; description: string }> = {
  'get_customer': { 
    name: 'Get Customer', 
    description: 'Retrieve customer information' 
  },
  'get_or_create_conversation': { 
    name: 'Start Conversation', 
    description: 'Find or create conversation thread' 
  },
  'send_message': { 
    name: 'Send Message', 
    description: 'Send message to customer' 
  },
  'send_email': { 
    name: 'Send Email', 
    description: 'Send email notification' 
  },
  'queue_email': { 
    name: 'Queue Follow-up', 
    description: 'Schedule follow-up email' 
  },
};

// Extract communication data from tool results
function extractCommunicationData(
  toolName: string, 
  result: any, 
  existing: Record<string, any>
): Record<string, any> {
  if (toolName === 'get_customer') {
    return {
      ...existing,
      customerName: result?.name || existing.customerName,
      customerEmail: result?.email || existing.customerEmail,
      customerId: result?.id || existing.customerId,
    };
  }
  if (toolName === 'get_or_create_conversation') {
    return {
      ...existing,
      conversationId: result?.conversation_id || result?.id || existing.conversationId,
      conversationTitle: result?.title || existing.conversationTitle,
    };
  }
  if (toolName === 'send_message') {
    return {
      ...existing,
      messagePreview: result?.content?.substring(0, 100) || existing.messagePreview,
    };
  }
  return existing;
}

// Check if a pattern should use CommunicationWorkflowCard
export function isCommunicationWorkflowPattern(pattern: MultiStepPattern | undefined): boolean {
  return pattern?.specialCardType === 'communication_workflow';
}

// Send communication workflow start event
export function sendCommunicationWorkflowStart(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan,
  initialEntities: Record<string, any>
): void {
  if (!controller) return;
  
  const encoder = new TextEncoder();
  const steps = plan.steps.map(s => {
    const stepInfo = COMMUNICATION_WORKFLOW_STEP_MAP[s.tool] || { name: s.name, description: s.description };
    return {
      id: s.id,
      name: stepInfo.name,
      description: stepInfo.description,
      status: s.status === 'pending' ? 'pending' : s.status,
      tool: s.tool,
    };
  });
  
  const event = {
    type: 'communication_workflow',
    planId: plan.id,
    workflow: {
      steps,
      currentStepIndex: 0,
      communicationData: {
        customerName: initialEntities?.customerName || initialEntities?.name,
        customerEmail: initialEntities?.customerEmail || initialEntities?.email,
        channel: initialEntities?.channel || 'portal',
      },
    },
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// Send communication workflow progress event
export function sendCommunicationWorkflowProgress(
  controller: ReadableStreamDefaultController | undefined,
  plan: ExecutionPlan,
  step: PlanStep,
  communicationData: Record<string, any>,
  automationSummary?: {
    conversationCreated?: boolean;
    conversationId?: string;
    messageSent?: boolean;
    messageId?: string;
    emailQueued?: boolean;
    emailScheduledFor?: string;
  }
): void {
  if (!controller) return;
  
  const encoder = new TextEncoder();
  const steps = plan.steps.map(s => {
    const stepInfo = COMMUNICATION_WORKFLOW_STEP_MAP[s.tool] || { name: s.name, description: s.description };
    return {
      id: s.id,
      name: stepInfo.name,
      description: stepInfo.description,
      status: s.status === 'running' ? 'in_progress' : s.status,
      tool: s.tool,
      result: s.result,
      error: s.error,
      verification: s.verification,
      rollbackExecuted: s.rollbackExecuted,
      rollbackTool: s.rollbackTool,
    };
  });
  
  const event: Record<string, any> = {
    type: 'communication_workflow_progress',
    planId: plan.id,
    stepIndex: plan.currentStepIndex,
    steps,
    communicationData,
  };
  
  if (automationSummary) {
    event.automationSummary = automationSummary;
  }
  
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// Fetch communication automation summary
export async function fetchCommunicationAutomationSummary(
  supabase: any,
  businessId: string,
  conversationId?: string
): Promise<{
  conversationCreated?: boolean;
  conversationId?: string;
  messageSent?: boolean;
  messageId?: string;
  emailQueued?: boolean;
  emailScheduledFor?: string;
} | undefined> {
  try {
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    
    const { data: recentActivity } = await supabase
      .from('ai_activity_log')
      .select('activity_type, description, metadata')
      .eq('business_id', businessId)
      .gte('created_at', thirtySecondsAgo)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!recentActivity || recentActivity.length === 0) {
      return undefined;
    }
    
    const summary: {
      conversationCreated?: boolean;
      conversationId?: string;
      messageSent?: boolean;
      messageId?: string;
      emailQueued?: boolean;
      emailScheduledFor?: string;
    } = {};
    
    for (const activity of recentActivity) {
      const actionType = activity.metadata?.action_type;
      
      if (actionType === 'conversation_created' && !summary.conversationCreated) {
        summary.conversationCreated = true;
        summary.conversationId = activity.metadata?.conversation_id;
      }
      if (actionType === 'message_sent' && !summary.messageSent) {
        summary.messageSent = true;
        summary.messageId = activity.metadata?.message_id;
      }
      if (actionType === 'email_queued' && !summary.emailQueued) {
        summary.emailQueued = true;
        summary.emailScheduledFor = activity.metadata?.scheduled_for;
      }
    }
    
    if (summary.conversationCreated || summary.messageSent || summary.emailQueued) {
      return summary;
    }
    
    return undefined;
  } catch (error) {
    console.error('[multi-step-planner] Failed to fetch communication automation summary:', error);
    return undefined;
  }
}

// Export communication data extractor
export { extractCommunicationData };

export async function pausePlanForRecovery(
  plan: ExecutionPlan,
  failedStepIndex: number,
  ctx: MemoryContext
): Promise<void> {
  console.info('[multi-step-planner] Pausing plan for recovery at step', failedStepIndex);
  plan.status = 'awaiting_recovery';
  plan.pausedAtStep = failedStepIndex;
  
  try {
    await dbUpdatePlanStatus(ctx, plan.id, 'awaiting_recovery');
  } catch (error) {
    console.error('[multi-step-planner] Failed to update plan status in DB:', error);
  }
}

export async function resumePlanAfterRecovery(
  planId: string,
  ctx: MemoryContext
): Promise<{ plan: ExecutionPlan; pattern: MultiStepPattern; entities: Record<string, any> } | null> {
  const stored = await getPendingPlanAsync(planId, ctx);
  if (!stored) {
    console.error('[multi-step-planner] Plan not found for resume:', planId);
    return null;
  }
  
  const { plan, pattern, entities } = stored;
  
  // Reset the failed step to 'pending' for retry
  if (plan.pausedAtStep !== undefined && plan.steps[plan.pausedAtStep]) {
    const failedStep = plan.steps[plan.pausedAtStep];
    failedStep.status = 'pending';
    failedStep.error = undefined;
    failedStep.result = undefined;
    console.info('[multi-step-planner] Reset step for retry:', failedStep.name);
  }
  
  plan.status = 'executing';
  plan.pausedAtStep = undefined;
  
  try {
    await dbUpdatePlanStatus(ctx, plan.id, 'executing');
  } catch (error) {
    console.error('[multi-step-planner] Failed to update plan status in DB:', error);
  }
  
  return { plan, pattern, entities };
}

// =============================================================================
// PENDING PLAN STORAGE - Uses ai_pending_plans database table for persistence
// =============================================================================

import { 
  storePendingPlan as dbStorePendingPlan,
  getPendingPlan as dbGetPendingPlan,
  getMostRecentPendingPlan as dbGetMostRecentPendingPlan,
  updatePlanStatus as dbUpdatePlanStatus,
  removePendingPlan as dbRemovePendingPlan,
  cleanupExpiredPlans as dbCleanupExpiredPlans,
  type PersistentPlan
} from './memory-manager.ts';

// In-memory cache for quick access (fallback + performance)
const pendingPlansCache = new Map<string, { plan: ExecutionPlan; pattern: MultiStepPattern; entities: Record<string, any>; userId: string }>();
const pendingPlansByUserCache = new Map<string, string>(); // userId -> planId

export async function storePendingPlanAsync(
  plan: ExecutionPlan,
  pattern: MultiStepPattern,
  entities: Record<string, any>,
  ctx: MemoryContext,
  existingPlanId?: string
): Promise<void> {
  const planIdToUse = existingPlanId || plan.id;
  
  console.info('[multi-step-planner] Storing plan:', {
    planId: planIdToUse,
    patternId: pattern.id,
    stepCount: plan.steps.length,
    isUpdate: !!existingPlanId,
  });
  
  try {
    // Store in database with explicit plan ID (upsert handles updates)
    await dbStorePendingPlan(ctx, { plan, pattern, entities }, pattern.id, planIdToUse);
    console.info('[multi-step-planner] Plan stored in database with ID:', planIdToUse);
  } catch (error) {
    console.error('[multi-step-planner] Failed to store plan in DB, using in-memory only:', error);
  }
  
  // Also cache in memory for quick access
  pendingPlansCache.set(planIdToUse, { plan, pattern, entities, userId: ctx.userId });
  pendingPlansByUserCache.set(ctx.userId, planIdToUse);
}

// Synchronous version for backward compatibility (uses cache only)
export function storePendingPlan(
  plan: ExecutionPlan,
  pattern: MultiStepPattern,
  entities: Record<string, any>,
  userId: string
): void {
  pendingPlansCache.set(plan.id, { plan, pattern, entities, userId });
  pendingPlansByUserCache.set(userId, plan.id);
  
  // Auto-cleanup from cache after 10 minutes (DB has its own expiry)
  setTimeout(() => {
    pendingPlansCache.delete(plan.id);
    if (pendingPlansByUserCache.get(userId) === plan.id) {
      pendingPlansByUserCache.delete(userId);
    }
  }, 10 * 60 * 1000);
}

// Helper to find a pattern by ID from the static array (preserves functions like argMapping)
function getPatternById(patternId: string): MultiStepPattern | undefined {
  return MULTI_STEP_PATTERNS.find(p => p.id === patternId);
}

export async function getPendingPlanAsync(
  planId: string,
  ctx: MemoryContext
): Promise<{ plan: ExecutionPlan; pattern: MultiStepPattern; entities: Record<string, any>; userId: string } | undefined> {
  // Check cache first
  const cached = pendingPlansCache.get(planId);
  if (cached) return cached;
  
  // Fall back to database
  try {
    const dbPlan = await dbGetPendingPlan(ctx, planId);
    if (dbPlan) {
      const planData = dbPlan.planData as { plan: ExecutionPlan; pattern: { id: string }; entities: Record<string, any> };
      
      // CRITICAL: Re-attach the full pattern from static array to restore argMapping functions
      // (JSON serialization loses functions, so pattern.argMapping would be undefined)
      const fullPattern = getPatternById(planData.pattern.id);
      if (!fullPattern) {
        console.error('[multi-step-planner] Pattern not found in static array:', planData.pattern.id);
        return undefined;
      }
      
      console.info('[multi-step-planner] Retrieved plan from DB and re-attached pattern:', {
        planId,
        patternId: fullPattern.id,
        stepCount: planData.plan.steps.length
      });
      
      const result = { plan: planData.plan, pattern: fullPattern, entities: planData.entities, userId: dbPlan.userId };
      // Cache it
      pendingPlansCache.set(planId, result);
      return result;
    }
  } catch (error) {
    console.error('[multi-step-planner] Failed to fetch plan from DB:', error);
  }
  
  return undefined;
}

// Synchronous version (cache only)
export function getPendingPlan(planId: string): { plan: ExecutionPlan; pattern: MultiStepPattern; entities: Record<string, any>; userId: string } | undefined {
  return pendingPlansCache.get(planId);
}

export async function getMostRecentPendingPlanAsync(
  ctx: MemoryContext
): Promise<{ plan: ExecutionPlan; pattern: MultiStepPattern; entities: Record<string, any>; userId: string } | undefined> {
  // Check cache first
  const cachedPlanId = pendingPlansByUserCache.get(ctx.userId);
  if (cachedPlanId) {
    const cached = pendingPlansCache.get(cachedPlanId);
    if (cached) return cached;
  }
  
  // Fall back to database
  try {
    const dbPlan = await dbGetMostRecentPendingPlan(ctx);
    if (dbPlan) {
      const planData = dbPlan.planData as { plan: ExecutionPlan; pattern: { id: string }; entities: Record<string, any> };
      
      // CRITICAL: Re-attach the full pattern from static array to restore argMapping functions
      const fullPattern = getPatternById(planData.pattern.id);
      if (!fullPattern) {
        console.error('[multi-step-planner] Pattern not found in static array:', planData.pattern.id);
        return undefined;
      }
      
      console.info('[multi-step-planner] Retrieved most recent plan from DB and re-attached pattern:', {
        planId: dbPlan.id,
        patternId: fullPattern.id
      });
      
      const result = { plan: planData.plan, pattern: fullPattern, entities: planData.entities, userId: dbPlan.userId };
      // Cache it
      pendingPlansCache.set(dbPlan.id, result);
      pendingPlansByUserCache.set(ctx.userId, dbPlan.id);
      return result;
    }
  } catch (error) {
    console.error('[multi-step-planner] Failed to fetch most recent plan from DB:', error);
  }
  
  return undefined;
}

// Synchronous version (cache only)
export function getMostRecentPendingPlan(userId: string): { plan: ExecutionPlan; pattern: MultiStepPattern; entities: Record<string, any>; userId: string } | undefined {
  const planId = pendingPlansByUserCache.get(userId);
  if (!planId) return undefined;
  return pendingPlansCache.get(planId);
}

export async function removePendingPlanAsync(planId: string, ctx: MemoryContext): Promise<void> {
  // Remove from cache
  const planData = pendingPlansCache.get(planId);
  if (planData) {
    if (pendingPlansByUserCache.get(planData.userId) === planId) {
      pendingPlansByUserCache.delete(planData.userId);
    }
  }
  pendingPlansCache.delete(planId);
  
  // Remove from database
  try {
    await dbRemovePendingPlan(ctx, planId);
    console.info('[multi-step-planner] Plan removed from database:', planId);
  } catch (error) {
    console.error('[multi-step-planner] Failed to remove plan from DB:', error);
  }
}

// Synchronous version (cache only)
export function removePendingPlan(planId: string): void {
  const planData = pendingPlansCache.get(planId);
  if (planData) {
    if (pendingPlansByUserCache.get(planData.userId) === planId) {
      pendingPlansByUserCache.delete(planData.userId);
    }
  }
  pendingPlansCache.delete(planId);
}

/**
 * Run cleanup of expired plans - call at start of request
 */
export async function cleanupExpiredPlansAsync(ctx: MemoryContext): Promise<void> {
  try {
    await dbCleanupExpiredPlans(ctx);
  } catch (error) {
    // Non-critical, just log
    console.warn('[multi-step-planner] Cleanup failed:', error);
  }
}

// =============================================================================
// PLAN APPROVAL DETECTION
// =============================================================================

export interface PlanApprovalResult {
  isApproval: boolean;
  isRejection: boolean;
  planId?: string;
}

export function detectPlanApproval(message: string): PlanApprovalResult {
  const trimmedMessage = message.trim();
  
  // Check for explicit plan ID patterns first
  const approvalMatch = trimmedMessage.match(/^plan_approve:([a-f0-9-]+)$/i);
  if (approvalMatch) {
    return { isApproval: true, isRejection: false, planId: approvalMatch[1] };
  }
  
  const rejectMatch = trimmedMessage.match(/^plan_reject:([a-f0-9-]+)$/i);
  if (rejectMatch) {
    return { isApproval: false, isRejection: true, planId: rejectMatch[1] };
  }
  
  // Check for generic approval patterns
  const approvalPatterns = [
    /^(yes|approve|confirm|proceed|execute|do it|go ahead|run it|start|let's do it)$/i,
  ];
  
  for (const pattern of approvalPatterns) {
    if (pattern.test(trimmedMessage)) {
      return { isApproval: true, isRejection: false };
    }
  }
  
  // Check for generic rejection patterns
  const rejectionPatterns = [
    /^(no|cancel|stop|reject|nevermind|don't|abort)$/i,
  ];
  
  for (const pattern of rejectionPatterns) {
    if (pattern.test(trimmedMessage)) {
      return { isApproval: false, isRejection: true };
    }
  }
  
  return { isApproval: false, isRejection: false };
}

// =============================================================================
// PLAN CANCELLED SSE HELPER
// =============================================================================

export function sendPlanCancelled(
  controller: ReadableStreamDefaultController | undefined,
  planId: string,
  message?: string
): void {
  if (!controller) {
    console.warn('[multi-step-planner] sendPlanCancelled called without controller');
    return;
  }
  const encoder = new TextEncoder();
  const event = {
    type: 'plan_cancelled',
    planId,
    message: message || 'Plan cancelled. How else can I help?',
  };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

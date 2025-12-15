/**
 * ServiceGrid AI Agent - Prompt Templates
 * 
 * Structured prompt templates for all 75+ intents across 12 domains.
 * Each template defines role, context, task, constraints, and required data.
 */

import type { Domain, IntentDefinition } from './intent-taxonomy';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface PromptTemplate {
  id: string;
  domain: Domain;
  intent: string;
  name: string;
  description: string;
  
  // Template sections with Handlebars-style placeholders
  template: {
    role: string;
    context: string;
    task: string;
    constraints: string;
    outputFormat: string;
  };
  
  // Context requirements (keys from Context Map)
  requiredContext: string[];
  optionalContext: string[];
  
  // Available tools for this intent
  tools: string[];
  
  // Risk and confirmation settings
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
  
  // Multi-step workflow hints
  followUpIntents?: string[];
  preConditions?: string[];
}

export type PromptTemplateRegistry = Record<string, PromptTemplate>;

// =============================================================================
// SHARED TEMPLATE FRAGMENTS
// =============================================================================

const ROLE_FRAGMENTS = {
  scheduler: `You are a scheduling coordinator for {{business_name}}, a service business.
Your user is {{user_name}} ({{user_role}}).
You help optimize schedules, balance workloads, and respect customer preferences.`,

  sales: `You are a sales assistant for {{business_name}}.
Your user is {{user_name}} ({{user_role}}).
You help create quotes, track opportunities, and manage the sales pipeline.`,

  operations: `You are an operations manager for {{business_name}}.
Your user is {{user_name}} ({{user_role}}).
You help manage jobs, track progress, and ensure quality service delivery.`,

  finance: `You are a finance assistant for {{business_name}}.
Your user is {{user_name}} ({{user_role}}).
You help with invoicing, payments, and financial record-keeping.`,

  hr: `You are an HR coordinator for {{business_name}}.
Your user is {{user_name}} ({{user_role}}).
You help manage team schedules, availability, and time off requests.`,

  customerService: `You are a customer service representative for {{business_name}}.
Your user is {{user_name}} ({{user_role}}).
You help manage customer relationships and communications.`,

  general: `You are a helpful assistant for {{business_name}}.
Your user is {{user_name}} ({{user_role}}).
You help with various business operations and tasks.`,
};

const CONSTRAINT_FRAGMENTS = {
  businessHours: `- Operating hours: {{operating_hours}}
- Respect time zone: {{timezone}}`,

  teamCapacity: `- Max jobs per team member per day: {{max_jobs_per_day}}
- Required break between jobs: {{min_break_minutes}} minutes
- Never double-book team members`,

  customerPrefs: `- Respect customer preferred days and times
- Avoid scheduling on customer's blocked days
- Consider customer location for travel optimization`,

  dataIntegrity: `- Validate all required fields before saving
- Maintain referential integrity
- Log all changes for audit trail`,

  financial: `- All amounts in {{currency}}
- Apply tax rate: {{tax_rate}}%
- Follow payment terms: {{payment_terms}}`,
};

// =============================================================================
// SCHEDULING DOMAIN TEMPLATES
// =============================================================================

const SCHEDULING_TEMPLATES: PromptTemplate[] = [
  {
    id: 'scheduling.batch_schedule',
    domain: 'scheduling',
    intent: 'batch_schedule',
    name: 'Batch Schedule Jobs',
    description: 'Schedule multiple unscheduled jobs optimally',
    template: {
      role: ROLE_FRAGMENTS.scheduler,
      context: `CURRENT STATE:
- {{unscheduled_jobs_count}} jobs need scheduling
- {{team_member_count}} active team members
- Date range: {{date_range_start}} to {{date_range_end}}
- Current capacity: {{capacity_percent}}% utilized

JOBS TO SCHEDULE:
{{#each unscheduled_jobs}}
- {{title}} | Customer: {{customer_name}} | Address: {{address}} | Priority: {{priority}} | Duration: {{estimated_duration_minutes}}min
{{/each}}

TEAM AVAILABILITY:
{{#each team_members}}
- {{name}}: {{available_hours}} hrs available | Skills: {{skills}}
{{/each}}

TIME OFF (Blocked):
{{#each time_off_requests}}
- {{member_name}}: {{start_date}} to {{end_date}}
{{/each}}

EXISTING SCHEDULED JOBS:
{{#each existing_jobs}}
- {{title}} | {{starts_at}} - {{ends_at}} | Assigned: {{assigned_to}}
{{/each}}`,
      task: `Schedule the unscheduled jobs listed above optimally, considering:
1. Minimize travel time by grouping geographically close jobs
2. Respect customer preferred times/days
3. Balance workload across team members
4. Prioritize urgent jobs (priority 1-2) first
5. Leave buffer time for travel between jobs`,
      constraints: `${CONSTRAINT_FRAGMENTS.businessHours}
${CONSTRAINT_FRAGMENTS.teamCapacity}
${CONSTRAINT_FRAGMENTS.customerPrefs}`,
      outputFormat: `Return scheduling suggestions with:
- Each job's recommended time slot
- Assigned team member
- Brief reasoning for the placement
- Any conflicts or warnings`,
    },
    requiredContext: ['business_name', 'user_name', 'unscheduled_jobs', 'team_members', 'date_range'],
    optionalContext: ['time_off_requests', 'existing_jobs', 'business_constraints', 'customer_preferences'],
    tools: ['batch_schedule_jobs', 'check_team_availability', 'get_scheduling_conflicts', 'optimize_route'],
    riskLevel: 'medium',
    requiresConfirmation: true,
    followUpIntents: ['optimize_route', 'notify_team'],
  },
  {
    id: 'scheduling.schedule_job',
    domain: 'scheduling',
    intent: 'schedule_job',
    name: 'Schedule Single Job',
    description: 'Schedule a specific job to a time slot',
    template: {
      role: ROLE_FRAGMENTS.scheduler,
      context: `JOB TO SCHEDULE:
- Title: {{job_title}}
- Customer: {{customer_name}}
- Address: {{job_address}}
- Estimated Duration: {{estimated_duration_minutes}} minutes
- Priority: {{priority}}
- Notes: {{job_notes}}

CUSTOMER PREFERENCES:
- Preferred Days: {{preferred_days}}
- Preferred Time: {{preferred_time_window}}
- Avoid Days: {{avoid_days}}

TEAM AVAILABILITY FOR {{target_date}}:
{{#each available_slots}}
- {{member_name}}: {{start_time}} - {{end_time}} ({{travel_time_from_previous}} min travel)
{{/each}}`,
      task: `Find the best time slot for this job on {{target_date}} or suggest alternative dates if unavailable.`,
      constraints: CONSTRAINT_FRAGMENTS.teamCapacity,
      outputFormat: `Suggest 2-3 time slot options with:
- Recommended time
- Assigned team member
- Travel time consideration
- Why this slot works best`,
    },
    requiredContext: ['job_data', 'customer_preferences', 'available_slots', 'target_date'],
    optionalContext: ['existing_jobs', 'team_location'],
    tools: ['schedule_job', 'check_team_availability', 'get_travel_time'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'scheduling.reschedule_job',
    domain: 'scheduling',
    intent: 'reschedule_job',
    name: 'Reschedule Job',
    description: 'Move an existing scheduled job to a new time',
    template: {
      role: ROLE_FRAGMENTS.scheduler,
      context: `JOB TO RESCHEDULE:
- Title: {{job_title}}
- Current Time: {{current_start}} - {{current_end}}
- Currently Assigned: {{current_assignee}}
- Customer: {{customer_name}}

REASON FOR RESCHEDULE: {{reschedule_reason}}

AVAILABLE ALTERNATIVES:
{{#each alternative_slots}}
- {{date}} {{start_time}} - {{end_time}} | {{member_name}} | Travel: {{travel_time}}min
{{/each}}`,
      task: `Find the best alternative time slot for this job, considering the reschedule reason and customer preferences.`,
      constraints: `${CONSTRAINT_FRAGMENTS.teamCapacity}
- Notify affected parties of the change
- Update any dependent jobs if needed`,
      outputFormat: `Recommend the best alternative with:
- New time slot
- Assigned team member (same or different)
- Impact on other jobs
- Customer notification needed (yes/no)`,
    },
    requiredContext: ['job_data', 'reschedule_reason', 'alternative_slots'],
    optionalContext: ['customer_preferences', 'dependent_jobs'],
    tools: ['reschedule_job', 'notify_customer', 'check_conflicts'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'scheduling.check_availability',
    domain: 'scheduling',
    intent: 'check_availability',
    name: 'Check Team Availability',
    description: 'View team availability for a date range',
    template: {
      role: ROLE_FRAGMENTS.scheduler,
      context: `DATE RANGE: {{start_date}} to {{end_date}}

TEAM AVAILABILITY:
{{#each team_members}}
{{name}}:
{{#each availability}}
  - {{day}}: {{start_time}} - {{end_time}} ({{status}})
{{/each}}
{{/each}}

SCHEDULED JOBS IN RANGE:
{{#each scheduled_jobs}}
- {{date}}: {{title}} | {{assigned_to}} | {{start_time}} - {{end_time}}
{{/each}}

TIME OFF REQUESTS:
{{#each time_off}}
- {{member_name}}: {{start_date}} to {{end_date}} ({{status}})
{{/each}}`,
      task: `Summarize team availability for the requested date range, highlighting:
- Open slots suitable for new jobs
- Team members with high/low utilization
- Any coverage gaps`,
      constraints: '',
      outputFormat: `Provide a clear availability summary with:
- Available hours per team member
- Best days for scheduling new jobs
- Any concerns or conflicts`,
    },
    requiredContext: ['team_members', 'date_range', 'scheduled_jobs'],
    optionalContext: ['time_off', 'business_constraints'],
    tools: ['get_team_availability', 'get_capacity_report'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'scheduling.optimize_route',
    domain: 'scheduling',
    intent: 'optimize_route',
    name: 'Optimize Route',
    description: 'Optimize job order for minimal travel time',
    template: {
      role: ROLE_FRAGMENTS.scheduler,
      context: `ROUTE OPTIMIZATION FOR: {{target_date}}
Team Member: {{team_member_name}}
Starting Location: {{start_location}}

JOBS TO OPTIMIZE:
{{#each jobs}}
- {{title}} | {{address}} | Duration: {{duration}}min | Time Window: {{time_window}}
{{/each}}

CURRENT ORDER TRAVEL TIME: {{current_total_travel}} minutes`,
      task: `Reorder the jobs to minimize total travel time while respecting any fixed time windows.`,
      constraints: `- Respect jobs with fixed appointment times
- Consider traffic patterns for the time of day
- Ensure adequate time for each job`,
      outputFormat: `Provide optimized route with:
- New job order (1, 2, 3...)
- Estimated travel time between each stop
- Total travel time savings
- Visual route summary`,
    },
    requiredContext: ['target_date', 'team_member', 'jobs', 'start_location'],
    optionalContext: ['traffic_data', 'fixed_appointments'],
    tools: ['optimize_route', 'get_directions', 'update_job_order'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'scheduling.resolve_conflict',
    domain: 'scheduling',
    intent: 'resolve_conflict',
    name: 'Resolve Scheduling Conflict',
    description: 'Handle overlapping or conflicting job schedules',
    template: {
      role: ROLE_FRAGMENTS.scheduler,
      context: `CONFLICT DETECTED:

CONFLICTING JOBS:
{{#each conflicting_jobs}}
- {{title}} | {{customer_name}} | {{start_time}} - {{end_time}} | Priority: {{priority}}
{{/each}}

CONFLICT TYPE: {{conflict_type}}
AFFECTED TEAM MEMBER: {{team_member_name}}

AVAILABLE RESOLUTION OPTIONS:
{{#each resolution_options}}
- Option {{index}}: {{description}}
{{/each}}`,
      task: `Recommend the best resolution for this scheduling conflict, considering job priorities and customer impact.`,
      constraints: `- Minimize customer disruption
- Prioritize urgent jobs
- Maintain team workload balance`,
      outputFormat: `Recommend resolution with:
- Chosen option and reasoning
- Jobs to be moved and new times
- Customers to notify
- Any follow-up actions needed`,
    },
    requiredContext: ['conflicting_jobs', 'conflict_type', 'resolution_options'],
    optionalContext: ['customer_preferences', 'job_priorities'],
    tools: ['reschedule_job', 'notify_customer', 'reassign_job'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'scheduling.suggest_times',
    domain: 'scheduling',
    intent: 'suggest_times',
    name: 'Suggest Available Times',
    description: 'Find available time slots for a new job',
    template: {
      role: ROLE_FRAGMENTS.scheduler,
      context: `LOOKING FOR AVAILABILITY:
- Service Type: {{service_type}}
- Estimated Duration: {{duration}} minutes
- Customer: {{customer_name}}
- Location: {{customer_address}}
- Preferred Date Range: {{date_range}}

CUSTOMER PREFERENCES:
- Preferred Days: {{preferred_days}}
- Preferred Times: {{preferred_time_window}}
- Avoid: {{avoid_days}}

TEAM CAPACITY:
{{#each team_members}}
- {{name}}: {{available_hours}} hrs open this week
{{/each}}`,
      task: `Find the 3-5 best available time slots that match customer preferences and team availability.`,
      constraints: CONSTRAINT_FRAGMENTS.customerPrefs,
      outputFormat: `List recommended slots:
1. [Best Match] Date, Time, Team Member - Why it's ideal
2. [Alternative] Date, Time, Team Member - Trade-offs
3. [Alternative] Date, Time, Team Member - Trade-offs`,
    },
    requiredContext: ['service_type', 'duration', 'customer_data', 'date_range', 'team_members'],
    optionalContext: ['customer_preferences', 'travel_considerations'],
    tools: ['get_available_slots', 'check_team_availability'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'scheduling.get_capacity',
    domain: 'scheduling',
    intent: 'get_capacity',
    name: 'Get Capacity Report',
    description: 'View team capacity and utilization metrics',
    template: {
      role: ROLE_FRAGMENTS.scheduler,
      context: `CAPACITY REPORT FOR: {{date_range}}

TEAM UTILIZATION:
{{#each team_members}}
- {{name}}: {{scheduled_hours}}/{{available_hours}} hrs ({{utilization_percent}}%)
  - Jobs: {{job_count}} | Travel: {{travel_hours}} hrs
{{/each}}

OVERALL METRICS:
- Total Capacity: {{total_capacity_hours}} hrs
- Total Scheduled: {{total_scheduled_hours}} hrs
- Utilization: {{overall_utilization}}%
- Unscheduled Jobs: {{unscheduled_count}}`,
      task: `Analyze capacity and provide insights on workload distribution and scheduling opportunities.`,
      constraints: '',
      outputFormat: `Capacity summary with:
- Utilization by team member
- Recommendations for balancing workload
- Optimal days for new jobs
- Any capacity concerns`,
    },
    requiredContext: ['date_range', 'team_members', 'scheduled_jobs'],
    optionalContext: ['unscheduled_jobs', 'capacity_targets'],
    tools: ['get_capacity_report', 'get_utilization_metrics'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
];

// =============================================================================
// QUOTE DOMAIN TEMPLATES
// =============================================================================

const QUOTE_TEMPLATES: PromptTemplate[] = [
  {
    id: 'quote.create',
    domain: 'quote_lifecycle',
    intent: 'create_quote',
    name: 'Create Quote',
    description: 'Create a new quote for a customer',
    template: {
      role: ROLE_FRAGMENTS.sales,
      context: `CUSTOMER:
- Name: {{customer_name}}
- Email: {{customer_email}}
- Address: {{customer_address}}
- Previous Quotes: {{previous_quote_count}}

SERVICE REQUEST:
{{#if request_data}}
- Request: {{request_description}}
- Submitted: {{request_created_at}}
{{/if}}

PRICING RULES:
- Labor Rate: \${{labor_rate}}/hr
- Material Markup: {{material_markup}}%
- Minimum Charge: \${{minimum_charge}}
- Tax Rate: {{tax_rate}}%`,
      task: `Create a professional quote based on the service description provided.`,
      constraints: `${CONSTRAINT_FRAGMENTS.financial}
- Include clear scope of work
- Specify validity period
- List any exclusions`,
      outputFormat: `Quote structure:
- Line items with quantities and prices
- Subtotal, tax, and total
- Terms and conditions
- Validity date`,
    },
    requiredContext: ['customer_data', 'pricing_rules'],
    optionalContext: ['request_data', 'previous_quotes', 'service_templates'],
    tools: ['create_quote', 'get_pricing_rules', 'apply_discount'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'quote.send',
    domain: 'quote_lifecycle',
    intent: 'send_quote',
    name: 'Send Quote',
    description: 'Send a quote to the customer via email',
    template: {
      role: ROLE_FRAGMENTS.sales,
      context: `QUOTE TO SEND:
- Quote #: {{quote_number}}
- Customer: {{customer_name}} ({{customer_email}})
- Total: \${{quote_total}}
- Valid Until: {{valid_until}}

LINE ITEMS:
{{#each line_items}}
- {{name}}: {{qty}} x \${{unit_price}} = \${{line_total}}
{{/each}}

QUOTE STATUS: {{quote_status}}`,
      task: `Send this quote to the customer with a professional email.`,
      constraints: `- Verify customer email is valid
- Include PDF attachment
- Set appropriate follow-up reminder`,
      outputFormat: `Confirm:
- Email sent to [address]
- Follow-up scheduled for [date]
- Quote status updated to "Sent"`,
    },
    requiredContext: ['quote_data', 'customer_data'],
    optionalContext: ['email_template', 'follow_up_days'],
    tools: ['send_quote', 'generate_quote_pdf', 'schedule_follow_up'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'quote.revise',
    domain: 'quote_lifecycle',
    intent: 'revise_quote',
    name: 'Revise Quote',
    description: 'Update an existing quote with changes',
    template: {
      role: ROLE_FRAGMENTS.sales,
      context: `ORIGINAL QUOTE:
- Quote #: {{quote_number}}
- Created: {{created_at}}
- Current Total: \${{current_total}}

CURRENT LINE ITEMS:
{{#each line_items}}
- {{name}}: {{qty}} x \${{unit_price}} = \${{line_total}}
{{/each}}

REQUESTED CHANGES:
{{revision_request}}`,
      task: `Update the quote based on the requested changes while maintaining professionalism.`,
      constraints: `- Maintain quote history
- Increment version number
- Note changes made`,
      outputFormat: `Revised quote with:
- Updated line items
- New total
- Change summary
- Option to notify customer`,
    },
    requiredContext: ['quote_data', 'revision_request'],
    optionalContext: ['pricing_rules', 'discount_limits'],
    tools: ['update_quote', 'recalculate_totals'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'quote.approve',
    domain: 'quote_lifecycle',
    intent: 'approve_quote',
    name: 'Approve Quote',
    description: 'Mark a quote as approved/accepted',
    template: {
      role: ROLE_FRAGMENTS.sales,
      context: `QUOTE FOR APPROVAL:
- Quote #: {{quote_number}}
- Customer: {{customer_name}}
- Total: \${{quote_total}}
- Created: {{created_at}}
- Valid Until: {{valid_until}}

APPROVAL DETAILS:
- Approved By: {{approved_by}}
- Approval Date: {{approval_date}}
{{#if signature}}
- Signature: Captured
{{/if}}`,
      task: `Mark this quote as approved and prepare for next steps (job creation or invoicing).`,
      constraints: `- Verify quote hasn't expired
- Capture approval source
- Trigger next workflow step`,
      outputFormat: `Confirmation:
- Quote approved
- Next step: [Create Job / Create Invoice]
- Customer notified: [Yes/No]`,
    },
    requiredContext: ['quote_data', 'approval_details'],
    optionalContext: ['signature_data', 'deposit_required'],
    tools: ['approve_quote', 'create_job_from_quote', 'create_invoice_from_quote'],
    riskLevel: 'medium',
    requiresConfirmation: true,
    followUpIntents: ['create_job', 'create_invoice'],
  },
  {
    id: 'quote.convert_to_job',
    domain: 'quote_lifecycle',
    intent: 'convert_quote_to_job',
    name: 'Convert Quote to Job',
    description: 'Create a job from an approved quote',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `APPROVED QUOTE:
- Quote #: {{quote_number}}
- Customer: {{customer_name}}
- Address: {{service_address}}
- Total: \${{quote_total}}
- Approved: {{approval_date}}

SCOPE OF WORK:
{{#each line_items}}
- {{name}}: {{qty}} {{unit}}
{{/each}}

SCHEDULING PREFERENCE:
{{#if preferred_date}}
- Preferred: {{preferred_date}}
{{/if}}`,
      task: `Create a job from this approved quote, ready for scheduling.`,
      constraints: `- Copy all relevant quote details
- Link job to quote for tracking
- Set appropriate job status`,
      outputFormat: `Job created:
- Job ID
- Linked to Quote #{{quote_number}}
- Ready for scheduling
- Suggested next: Schedule job`,
    },
    requiredContext: ['quote_data'],
    optionalContext: ['scheduling_preferences', 'assigned_team'],
    tools: ['create_job_from_quote', 'schedule_job'],
    riskLevel: 'low',
    requiresConfirmation: true,
    followUpIntents: ['schedule_job'],
  },
  {
    id: 'quote.generate_pdf',
    domain: 'quote_lifecycle',
    intent: 'generate_quote_pdf',
    name: 'Generate Quote PDF',
    description: 'Generate a PDF version of a quote',
    template: {
      role: ROLE_FRAGMENTS.sales,
      context: `QUOTE FOR PDF:
- Quote #: {{quote_number}}
- Customer: {{customer_name}}
- Total: \${{quote_total}}

BUSINESS BRANDING:
- Logo: {{logo_url}}
- Business Name: {{business_name}}
- Contact: {{business_phone}}`,
      task: `Generate a professional PDF of this quote for download or sending.`,
      constraints: `- Use business branding
- Include all terms
- Ensure proper formatting`,
      outputFormat: `PDF generated:
- Download link
- File size
- Option to send directly`,
    },
    requiredContext: ['quote_data', 'business_branding'],
    optionalContext: ['pdf_template'],
    tools: ['generate_quote_pdf'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
];

// =============================================================================
// JOB/WORK ORDER DOMAIN TEMPLATES
// =============================================================================

const JOB_TEMPLATES: PromptTemplate[] = [
  {
    id: 'job.create',
    domain: 'job_management',
    intent: 'create_job',
    name: 'Create Job',
    description: 'Create a new job/work order',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `CUSTOMER:
- Name: {{customer_name}}
- Address: {{customer_address}}
- Phone: {{customer_phone}}
- Notes: {{customer_notes}}

JOB DETAILS:
- Title: {{job_title}}
- Description: {{job_description}}
- Estimated Duration: {{duration}} minutes
- Priority: {{priority}}`,
      task: `Create a new job with the provided details.`,
      constraints: CONSTRAINT_FRAGMENTS.dataIntegrity,
      outputFormat: `Job created:
- Job ID
- Customer linked
- Ready for: [Scheduling / Assignment]`,
    },
    requiredContext: ['customer_data', 'job_details'],
    optionalContext: ['quote_reference', 'preferred_schedule'],
    tools: ['create_job', 'assign_job', 'schedule_job'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'job.update_status',
    domain: 'job_management',
    intent: 'update_job_status',
    name: 'Update Job Status',
    description: 'Change the status of a job',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `JOB:
- ID: {{job_id}}
- Title: {{job_title}}
- Current Status: {{current_status}}
- Assigned To: {{assigned_to}}
- Scheduled: {{scheduled_time}}

STATUS CHANGE:
- New Status: {{new_status}}
- Reason: {{status_reason}}`,
      task: `Update the job status and trigger any related workflows.`,
      constraints: `- Valid status transitions only
- Log status change with timestamp
- Notify relevant parties`,
      outputFormat: `Status updated:
- {{current_status}} → {{new_status}}
- Notifications sent to: [list]
- Next actions: [if any]`,
    },
    requiredContext: ['job_data', 'new_status'],
    optionalContext: ['status_reason', 'notification_preferences'],
    tools: ['update_job_status', 'notify_customer', 'notify_team'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'job.assign',
    domain: 'job_management',
    intent: 'assign_job',
    name: 'Assign Job',
    description: 'Assign team members to a job',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `JOB TO ASSIGN:
- Title: {{job_title}}
- Location: {{job_address}}
- Scheduled: {{scheduled_time}}
- Skills Needed: {{required_skills}}
- Current Assignment: {{current_assignment}}

AVAILABLE TEAM MEMBERS:
{{#each available_members}}
- {{name}}: {{skills}} | {{current_workload}} jobs today
{{/each}}`,
      task: `Assign the most suitable team member(s) to this job.`,
      constraints: `- Consider skills match
- Balance workload
- Account for travel time`,
      outputFormat: `Assignment:
- Assigned to: [name(s)]
- Reasoning: [why they're best fit]
- Notifications: [sent/pending]`,
    },
    requiredContext: ['job_data', 'available_members'],
    optionalContext: ['required_skills', 'workload_data'],
    tools: ['assign_job', 'notify_team_member', 'sync_checklist_assignments'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'job.add_notes',
    domain: 'job_management',
    intent: 'add_job_notes',
    name: 'Add Job Notes',
    description: 'Add notes or updates to a job',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `JOB:
- Title: {{job_title}}
- Status: {{job_status}}
- Customer: {{customer_name}}

EXISTING NOTES:
{{#each existing_notes}}
- [{{timestamp}}] {{author}}: {{content}}
{{/each}}

NEW NOTE:
{{note_content}}`,
      task: `Add the new note to the job record.`,
      constraints: `- Include timestamp
- Associate with current user
- Preserve existing notes`,
      outputFormat: `Note added:
- Timestamp
- Visible to: [team/customer/both]`,
    },
    requiredContext: ['job_data', 'note_content'],
    optionalContext: ['existing_notes', 'visibility_setting'],
    tools: ['add_job_note'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'job.upload_media',
    domain: 'job_management',
    intent: 'upload_job_media',
    name: 'Upload Job Media',
    description: 'Attach photos or videos to a job',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `JOB:
- Title: {{job_title}}
- Status: {{job_status}}

MEDIA TO UPLOAD:
- Type: {{media_type}}
- Count: {{media_count}}
{{#if media_description}}
- Description: {{media_description}}
{{/if}}

EXISTING MEDIA:
- Photos: {{existing_photo_count}}
- Videos: {{existing_video_count}}`,
      task: `Upload and attach the media files to this job.`,
      constraints: `- Validate file types (images, videos)
- Generate thumbnails
- Extract GPS/EXIF data if available`,
      outputFormat: `Media uploaded:
- Files attached: [count]
- Thumbnails generated: [yes/no]
- Location data: [if extracted]`,
    },
    requiredContext: ['job_data', 'media_files'],
    optionalContext: ['media_description', 'checklist_item_id'],
    tools: ['upload_job_media', 'generate_thumbnail'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'job.view_details',
    domain: 'job_management',
    intent: 'view_job_details',
    name: 'View Job Details',
    description: 'Get detailed information about a job',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `JOB DETAILS:
- ID: {{job_id}}
- Title: {{job_title}}
- Status: {{job_status}}
- Customer: {{customer_name}} ({{customer_email}})
- Address: {{job_address}}
- Scheduled: {{scheduled_start}} - {{scheduled_end}}
- Assigned: {{assigned_members}}
- Priority: {{priority}}

RELATED:
- Quote: {{quote_number}}
- Invoice: {{invoice_number}}
- Checklist: {{checklist_status}}

NOTES:
{{#each notes}}
- [{{timestamp}}] {{content}}
{{/each}}

MEDIA:
- {{photo_count}} photos, {{video_count}} videos`,
      task: `Present a comprehensive overview of this job.`,
      constraints: '',
      outputFormat: `Job summary with all relevant details organized clearly.`,
    },
    requiredContext: ['job_data'],
    optionalContext: ['related_quote', 'related_invoice', 'checklist_data', 'media_data'],
    tools: ['get_job_details'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'job.complete',
    domain: 'job_management',
    intent: 'complete_job',
    name: 'Complete Job',
    description: 'Mark a job as completed',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `JOB TO COMPLETE:
- Title: {{job_title}}
- Customer: {{customer_name}}
- Started: {{clock_in_time}}
- Duration: {{actual_duration}} minutes

COMPLETION CHECK:
- Checklist: {{checklist_completion}}% complete
- Photos uploaded: {{photo_count}}
- Notes added: {{has_notes}}

NEXT STEPS:
{{#if requires_invoice}}
- Invoice needed: Yes (\${{job_total}})
{{/if}}`,
      task: `Mark this job as completed and trigger any follow-up workflows.`,
      constraints: `- Verify checklist completion
- Ensure required photos are uploaded
- Trigger invoicing if needed`,
      outputFormat: `Job completed:
- Final status: Completed
- Duration logged: [time]
- Invoice: [created/not needed]
- Customer notification: [sent/pending]`,
    },
    requiredContext: ['job_data', 'completion_data'],
    optionalContext: ['checklist_status', 'invoice_required'],
    tools: ['complete_job', 'create_invoice', 'notify_customer'],
    riskLevel: 'medium',
    requiresConfirmation: true,
    followUpIntents: ['create_invoice', 'send_completion_email'],
  },
  {
    id: 'job.cancel',
    domain: 'job_management',
    intent: 'cancel_job',
    name: 'Cancel Job',
    description: 'Cancel a scheduled job',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `JOB TO CANCEL:
- Title: {{job_title}}
- Customer: {{customer_name}}
- Scheduled: {{scheduled_time}}
- Assigned: {{assigned_members}}
- Status: {{current_status}}

CANCELLATION:
- Reason: {{cancel_reason}}
- Requested by: {{cancelled_by}}`,
      task: `Cancel this job and notify all affected parties.`,
      constraints: `- Cannot cancel completed jobs
- Notify assigned team members
- Update customer
- Free up schedule slot`,
      outputFormat: `Job cancelled:
- Previous status: {{current_status}}
- Team notified: [yes/no]
- Customer notified: [yes/no]
- Schedule slot freed: [yes/no]`,
    },
    requiredContext: ['job_data', 'cancel_reason'],
    optionalContext: ['refund_required', 'reschedule_option'],
    tools: ['cancel_job', 'notify_customer', 'notify_team', 'process_refund'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },
];

// =============================================================================
// INVOICE DOMAIN TEMPLATES
// =============================================================================

const INVOICE_TEMPLATES: PromptTemplate[] = [
  {
    id: 'invoice.create',
    domain: 'invoicing',
    intent: 'create_invoice',
    name: 'Create Invoice',
    description: 'Create a new invoice',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `CUSTOMER:
- Name: {{customer_name}}
- Email: {{customer_email}}
- Address: {{billing_address}}

SOURCE:
{{#if job_data}}
- From Job: {{job_title}} ({{job_status}})
{{/if}}
{{#if quote_data}}
- From Quote: {{quote_number}}
{{/if}}

LINE ITEMS:
{{#each line_items}}
- {{name}}: {{qty}} x \${{unit_price}} = \${{line_total}}
{{/each}}

INVOICE SETTINGS:
- Tax Rate: {{tax_rate}}%
- Payment Terms: {{payment_terms}}
- Due Date: {{due_date}}`,
      task: `Create an invoice with the provided details.`,
      constraints: CONSTRAINT_FRAGMENTS.financial,
      outputFormat: `Invoice created:
- Invoice #: [number]
- Total: $[amount]
- Due: [date]
- Ready to send: [yes/no]`,
    },
    requiredContext: ['customer_data', 'line_items'],
    optionalContext: ['job_data', 'quote_data', 'payment_terms'],
    tools: ['create_invoice', 'calculate_totals'],
    riskLevel: 'low',
    requiresConfirmation: false,
    followUpIntents: ['send_invoice'],
  },
  {
    id: 'invoice.send',
    domain: 'invoicing',
    intent: 'send_invoice',
    name: 'Send Invoice',
    description: 'Send an invoice to the customer',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `INVOICE TO SEND:
- Invoice #: {{invoice_number}}
- Customer: {{customer_name}} ({{customer_email}})
- Amount: \${{invoice_total}}
- Due: {{due_date}}
- Status: {{invoice_status}}

PAYMENT LINK: {{payment_link}}`,
      task: `Send this invoice to the customer via email with payment link.`,
      constraints: `- Include PDF attachment
- Include payment link
- Set status to "Sent"`,
      outputFormat: `Invoice sent:
- Email delivered to: [address]
- Payment link included: [yes]
- Reminder scheduled: [date]`,
    },
    requiredContext: ['invoice_data', 'customer_data'],
    optionalContext: ['email_template', 'payment_link'],
    tools: ['send_invoice', 'generate_invoice_pdf', 'schedule_reminder'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'invoice.void',
    domain: 'invoicing',
    intent: 'void_invoice',
    name: 'Void Invoice',
    description: 'Void/cancel an invoice',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `INVOICE TO VOID:
- Invoice #: {{invoice_number}}
- Customer: {{customer_name}}
- Amount: \${{invoice_total}}
- Status: {{current_status}}
- Payments: {{payment_status}}

VOID REASON: {{void_reason}}`,
      task: `Void this invoice and handle any payment implications.`,
      constraints: `- Cannot void if fully paid (refund first)
- Maintain audit trail
- Notify customer`,
      outputFormat: `Invoice voided:
- Previous status: [status]
- Refund needed: [yes/no]
- Customer notified: [yes/no]`,
    },
    requiredContext: ['invoice_data', 'void_reason'],
    optionalContext: ['payment_data', 'refund_required'],
    tools: ['void_invoice', 'process_refund', 'notify_customer'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },
  {
    id: 'invoice.apply_credit',
    domain: 'invoicing',
    intent: 'apply_credit',
    name: 'Apply Credit',
    description: 'Apply a credit or discount to an invoice',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `INVOICE:
- Invoice #: {{invoice_number}}
- Current Total: \${{current_total}}
- Amount Paid: \${{amount_paid}}
- Balance Due: \${{balance_due}}

CREDIT TO APPLY:
- Amount: \${{credit_amount}}
- Reason: {{credit_reason}}`,
      task: `Apply the credit to this invoice and recalculate totals.`,
      constraints: `- Credit cannot exceed balance due
- Log credit with reason
- Adjust payment status if fully credited`,
      outputFormat: `Credit applied:
- Credit: -\${{credit_amount}}
- New Balance: \$[amount]
- Status: [updated status]`,
    },
    requiredContext: ['invoice_data', 'credit_amount', 'credit_reason'],
    optionalContext: ['credit_source'],
    tools: ['apply_credit', 'recalculate_invoice'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'invoice.reminder',
    domain: 'invoicing',
    intent: 'send_invoice_reminder',
    name: 'Send Invoice Reminder',
    description: 'Send a payment reminder for an overdue invoice',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `OVERDUE INVOICE:
- Invoice #: {{invoice_number}}
- Customer: {{customer_name}} ({{customer_email}})
- Amount Due: \${{balance_due}}
- Due Date: {{due_date}}
- Days Overdue: {{days_overdue}}

PREVIOUS REMINDERS:
{{#each previous_reminders}}
- {{date}}: {{type}}
{{/each}}`,
      task: `Send a payment reminder to the customer.`,
      constraints: `- Use appropriate tone based on days overdue
- Include payment link
- Log reminder sent`,
      outputFormat: `Reminder sent:
- Email to: [address]
- Reminder #: [count]
- Escalation needed: [yes/no]`,
    },
    requiredContext: ['invoice_data', 'customer_data'],
    optionalContext: ['previous_reminders', 'escalation_policy'],
    tools: ['send_invoice_reminder', 'schedule_follow_up'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'invoice.generate_pdf',
    domain: 'invoicing',
    intent: 'generate_invoice_pdf',
    name: 'Generate Invoice PDF',
    description: 'Generate a PDF version of an invoice',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `INVOICE FOR PDF:
- Invoice #: {{invoice_number}}
- Customer: {{customer_name}}
- Total: \${{invoice_total}}

BUSINESS BRANDING:
- Logo: {{logo_url}}
- Business Name: {{business_name}}`,
      task: `Generate a professional PDF of this invoice.`,
      constraints: `- Use business branding
- Include payment instructions
- Proper formatting`,
      outputFormat: `PDF generated:
- Download link
- Option to send directly`,
    },
    requiredContext: ['invoice_data', 'business_branding'],
    optionalContext: ['pdf_template'],
    tools: ['generate_invoice_pdf'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
];

// =============================================================================
// CUSTOMER DOMAIN TEMPLATES
// =============================================================================

const CUSTOMER_TEMPLATES: PromptTemplate[] = [
  {
    id: 'customer.create',
    domain: 'customer_acquisition',
    intent: 'create_customer',
    name: 'Create Customer',
    description: 'Create a new customer record',
    template: {
      role: ROLE_FRAGMENTS.customerService,
      context: `NEW CUSTOMER DETAILS:
- Name: {{customer_name}}
- Email: {{customer_email}}
- Phone: {{customer_phone}}
- Address: {{customer_address}}
- Notes: {{customer_notes}}

SOURCE: {{acquisition_source}}`,
      task: `Create a new customer record with the provided information.`,
      constraints: `${CONSTRAINT_FRAGMENTS.dataIntegrity}
- Check for duplicates
- Validate email format
- Format phone number`,
      outputFormat: `Customer created:
- Customer ID
- Profile complete: [percentage]
- Suggested next: [Create Quote / Schedule Job]`,
    },
    requiredContext: ['customer_details'],
    optionalContext: ['acquisition_source', 'preferences'],
    tools: ['create_customer', 'check_duplicates'],
    riskLevel: 'low',
    requiresConfirmation: false,
    followUpIntents: ['create_quote', 'create_job'],
  },
  {
    id: 'customer.update',
    domain: 'customer_acquisition',
    intent: 'update_customer',
    name: 'Update Customer',
    description: 'Update customer information',
    template: {
      role: ROLE_FRAGMENTS.customerService,
      context: `CURRENT CUSTOMER:
- Name: {{customer_name}}
- Email: {{customer_email}}
- Phone: {{customer_phone}}
- Address: {{customer_address}}

UPDATES:
{{update_fields}}`,
      task: `Update the customer record with the new information.`,
      constraints: CONSTRAINT_FRAGMENTS.dataIntegrity,
      outputFormat: `Customer updated:
- Fields changed: [list]
- Previous values preserved in history`,
    },
    requiredContext: ['customer_data', 'update_fields'],
    optionalContext: [],
    tools: ['update_customer'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'customer.search',
    domain: 'customer_acquisition',
    intent: 'search_customer',
    name: 'Search Customers',
    description: 'Search for customers by name, email, or phone',
    template: {
      role: ROLE_FRAGMENTS.customerService,
      context: `SEARCH QUERY: {{search_query}}

FILTERS:
{{#if filter_status}}
- Status: {{filter_status}}
{{/if}}
{{#if filter_location}}
- Location: {{filter_location}}
{{/if}}`,
      task: `Search for customers matching the criteria.`,
      constraints: '',
      outputFormat: `Search results:
- [Count] customers found
- List with name, email, phone, last activity`,
    },
    requiredContext: ['search_query'],
    optionalContext: ['filters'],
    tools: ['search_customers'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'customer.view_history',
    domain: 'customer_acquisition',
    intent: 'view_customer_history',
    name: 'View Customer History',
    description: 'View complete customer interaction history',
    template: {
      role: ROLE_FRAGMENTS.customerService,
      context: `CUSTOMER:
- Name: {{customer_name}}
- Since: {{customer_since}}
- Total Jobs: {{total_jobs}}
- Total Revenue: \${{total_revenue}}

RECENT ACTIVITY:
{{#each recent_activity}}
- {{date}}: {{type}} - {{description}}
{{/each}}

OPEN ITEMS:
- Pending Quotes: {{pending_quotes}}
- Scheduled Jobs: {{scheduled_jobs}}
- Outstanding Invoices: \${{outstanding_amount}}`,
      task: `Present a comprehensive view of this customer's history and current status.`,
      constraints: '',
      outputFormat: `Customer summary with timeline of interactions, current status, and key metrics.`,
    },
    requiredContext: ['customer_data', 'activity_history'],
    optionalContext: ['quotes', 'jobs', 'invoices'],
    tools: ['get_customer_history', 'get_customer_stats'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'customer.invite_portal',
    domain: 'customer_acquisition',
    intent: 'invite_to_portal',
    name: 'Invite to Portal',
    description: 'Send a portal invitation to a customer',
    template: {
      role: ROLE_FRAGMENTS.customerService,
      context: `CUSTOMER:
- Name: {{customer_name}}
- Email: {{customer_email}}
- Portal Status: {{portal_status}}

BUSINESS PORTAL:
- URL: {{portal_url}}
- Features: View jobs, Pay invoices, Message team`,
      task: `Send a portal invitation to this customer.`,
      constraints: `- Customer must have valid email
- Check existing portal status
- Include setup instructions`,
      outputFormat: `Invitation sent:
- Email to: [address]
- Invite expires: [date]
- Portal features: [list]`,
    },
    requiredContext: ['customer_data'],
    optionalContext: ['portal_config'],
    tools: ['send_portal_invite'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
];

// =============================================================================
// PAYMENT DOMAIN TEMPLATES
// =============================================================================

const PAYMENT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'payment.record',
    domain: 'payment_processing',
    intent: 'record_payment',
    name: 'Record Payment',
    description: 'Record a payment against an invoice',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `INVOICE:
- Invoice #: {{invoice_number}}
- Total: \${{invoice_total}}
- Amount Paid: \${{amount_paid}}
- Balance Due: \${{balance_due}}

PAYMENT DETAILS:
- Amount: \${{payment_amount}}
- Method: {{payment_method}}
- Date: {{payment_date}}
- Reference: {{payment_reference}}`,
      task: `Record this payment and update the invoice status.`,
      constraints: `- Validate payment amount
- Update invoice status (partial/paid)
- Generate receipt if requested`,
      outputFormat: `Payment recorded:
- Receipt #: [number]
- Invoice status: [Partial/Paid]
- Remaining balance: \$[amount]`,
    },
    requiredContext: ['invoice_data', 'payment_details'],
    optionalContext: ['receipt_template'],
    tools: ['record_payment', 'update_invoice_status', 'generate_receipt'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'payment.process_stripe',
    domain: 'payment_processing',
    intent: 'process_stripe_payment',
    name: 'Process Stripe Payment',
    description: 'Process an online payment via Stripe',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `PAYMENT REQUEST:
- Invoice #: {{invoice_number}}
- Amount: \${{payment_amount}}
- Customer: {{customer_name}}

STRIPE STATUS:
- Connected: {{stripe_connected}}
- Customer ID: {{stripe_customer_id}}`,
      task: `Process this payment through Stripe.`,
      constraints: `- Verify Stripe connection
- Handle payment errors gracefully
- Send confirmation email`,
      outputFormat: `Payment processed:
- Status: [Success/Failed]
- Transaction ID: [id]
- Confirmation sent: [yes/no]`,
    },
    requiredContext: ['invoice_data', 'stripe_config'],
    optionalContext: ['saved_payment_method'],
    tools: ['process_stripe_payment', 'record_payment'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'payment.refund',
    domain: 'payment_processing',
    intent: 'refund_payment',
    name: 'Refund Payment',
    description: 'Process a refund for a previous payment',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `ORIGINAL PAYMENT:
- Payment #: {{payment_id}}
- Amount: \${{payment_amount}}
- Method: {{payment_method}}
- Date: {{payment_date}}
- Invoice: {{invoice_number}}

REFUND REQUEST:
- Amount: \${{refund_amount}}
- Reason: {{refund_reason}}
- Full/Partial: {{refund_type}}`,
      task: `Process this refund and update all related records.`,
      constraints: `- Refund cannot exceed original payment
- Update invoice balance
- Notify customer`,
      outputFormat: `Refund processed:
- Amount: \${{refund_amount}}
- Method: [same as original/other]
- Invoice updated: [yes]
- Customer notified: [yes]`,
    },
    requiredContext: ['payment_data', 'refund_details'],
    optionalContext: ['invoice_data'],
    tools: ['process_refund', 'update_invoice', 'notify_customer'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },
  {
    id: 'payment.view_history',
    domain: 'payment_processing',
    intent: 'view_payment_history',
    name: 'View Payment History',
    description: 'View payment history for a customer or invoice',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `PAYMENT HISTORY FOR: {{entity_type}} - {{entity_name}}

PAYMENTS:
{{#each payments}}
- {{date}}: \${{amt}} via {{method}} - {{status}}
  Invoice: {{invoice_number}}
{{/each}}

SUMMARY:
- Total Paid: \${{total_paid}}
- Pending: \${{total_pending}}
- Refunded: \${{total_refunded}}`,
      task: `Present the payment history in a clear format.`,
      constraints: '',
      outputFormat: `Payment history with totals and trends.`,
    },
    requiredContext: ['entity_data', 'payment_history'],
    optionalContext: [],
    tools: ['get_payment_history'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
];

// =============================================================================
// TEAM MANAGEMENT DOMAIN TEMPLATES
// =============================================================================

const TEAM_TEMPLATES: PromptTemplate[] = [
  {
    id: 'team.invite_member',
    domain: 'team_management',
    intent: 'invite_member',
    name: 'Invite Team Member',
    description: 'Send an invitation to join the team',
    template: {
      role: ROLE_FRAGMENTS.hr,
      context: `NEW MEMBER:
- Email: {{member_email}}
- Role: {{member_role}}
- Permissions: {{permissions}}

CURRENT TEAM:
- Total Members: {{team_count}}
- Roles: {{role_breakdown}}`,
      task: `Send a team invitation to this person.`,
      constraints: `- Check for existing account
- Set appropriate permissions
- Include onboarding info`,
      outputFormat: `Invitation sent:
- Email to: [address]
- Role: [role]
- Expires: [date]`,
    },
    requiredContext: ['member_details', 'team_data'],
    optionalContext: ['permission_template'],
    tools: ['invite_team_member'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'team.manage_availability',
    domain: 'team_management',
    intent: 'manage_availability',
    name: 'Manage Availability',
    description: 'Set or update team member availability',
    template: {
      role: ROLE_FRAGMENTS.hr,
      context: `TEAM MEMBER: {{member_name}}

CURRENT AVAILABILITY:
{{#each current_availability}}
- {{day}}: {{start_time}} - {{end_time}}
{{/each}}

REQUESTED CHANGES:
{{availability_changes}}`,
      task: `Update the team member's availability schedule.`,
      constraints: `- Validate time formats
- Check for scheduling conflicts
- Notify affected parties`,
      outputFormat: `Availability updated:
- New schedule: [summary]
- Conflicts detected: [if any]`,
    },
    requiredContext: ['member_data', 'availability_changes'],
    optionalContext: ['current_availability', 'scheduled_jobs'],
    tools: ['update_availability', 'check_conflicts'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'team.request_time_off',
    domain: 'team_management',
    intent: 'request_time_off',
    name: 'Request Time Off',
    description: 'Submit a time off request',
    template: {
      role: ROLE_FRAGMENTS.hr,
      context: `TEAM MEMBER: {{member_name}}

TIME OFF REQUEST:
- Start: {{start_date}}
- End: {{end_date}}
- Type: {{time_off_type}}
- Notes: {{notes}}

SCHEDULED JOBS DURING PERIOD:
{{#each affected_jobs}}
- {{date}}: {{job_title}}
{{/each}}`,
      task: `Submit this time off request for approval.`,
      constraints: `- Check for job conflicts
- Follow approval workflow
- Update calendar`,
      outputFormat: `Request submitted:
- Dates: [range]
- Status: Pending Approval
- Jobs affected: [count]`,
    },
    requiredContext: ['member_data', 'time_off_details'],
    optionalContext: ['affected_jobs', 'approval_workflow'],
    tools: ['submit_time_off_request', 'check_job_conflicts'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
  {
    id: 'team.approve_time_off',
    domain: 'team_management',
    intent: 'approve_time_off',
    name: 'Approve Time Off',
    description: 'Approve or deny a time off request',
    template: {
      role: ROLE_FRAGMENTS.hr,
      context: `TIME OFF REQUEST:
- From: {{member_name}}
- Dates: {{start_date}} to {{end_date}}
- Type: {{time_off_type}}
- Reason: {{notes}}

COVERAGE CHECK:
- Jobs affected: {{affected_job_count}}
- Coverage available: {{coverage_status}}`,
      task: `Review and approve/deny this time off request.`,
      constraints: `- Consider coverage
- Notify team member
- Update schedule`,
      outputFormat: `Decision:
- Status: [Approved/Denied]
- Coverage arranged: [if applicable]
- Member notified: [yes]`,
    },
    requiredContext: ['time_off_request', 'coverage_status'],
    optionalContext: ['affected_jobs'],
    tools: ['approve_time_off', 'deny_time_off', 'arrange_coverage'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'team.view_utilization',
    domain: 'team_management',
    intent: 'view_utilization',
    name: 'View Team Utilization',
    description: 'View team utilization and productivity metrics',
    template: {
      role: ROLE_FRAGMENTS.hr,
      context: `UTILIZATION REPORT: {{date_range}}

TEAM METRICS:
{{#each team_members}}
- {{name}}:
  - Hours Worked: {{hours_worked}}
  - Jobs Completed: {{jobs_completed}}
  - Utilization: {{utilization}}%
{{/each}}

TOTALS:
- Total Hours: {{total_hours}}
- Average Utilization: {{avg_utilization}}%`,
      task: `Present team utilization metrics and insights.`,
      constraints: '',
      outputFormat: `Utilization summary with trends and recommendations.`,
    },
    requiredContext: ['date_range', 'team_metrics'],
    optionalContext: ['comparison_period'],
    tools: ['get_utilization_report'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
];

// =============================================================================
// CHECKLIST DOMAIN TEMPLATES
// =============================================================================

const CHECKLIST_TEMPLATES: PromptTemplate[] = [
  {
    id: 'checklist.create_template',
    domain: 'checklists',
    intent: 'create_checklist_template',
    name: 'Create Checklist Template',
    description: 'Create a reusable checklist template',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `NEW TEMPLATE:
- Name: {{template_name}}
- Category: {{category}}
- Description: {{description}}

ITEMS:
{{#each items}}
- {{title}} (Required: {{required}})
{{/each}}`,
      task: `Create a new checklist template with the specified items.`,
      constraints: `- Clear item descriptions
- Logical ordering
- Include required fields`,
      outputFormat: `Template created:
- Template ID
- Item count
- Ready for use`,
    },
    requiredContext: ['template_details', 'items'],
    optionalContext: ['category'],
    tools: ['create_checklist_template'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'checklist.assign',
    domain: 'checklists',
    intent: 'assign_checklist',
    name: 'Assign Checklist',
    description: 'Assign a checklist to a job',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `JOB:
- Title: {{job_title}}
- Assigned To: {{assigned_members}}

CHECKLIST TEMPLATE: {{template_name}}
- Items: {{item_count}}
- Estimated Time: {{estimated_time}}`,
      task: `Assign this checklist template to the job.`,
      constraints: `- Create items from template
- Assign to job members
- Track completion`,
      outputFormat: `Checklist assigned:
- Items created: [count]
- Assigned to: [names]`,
    },
    requiredContext: ['job_data', 'template_data'],
    optionalContext: ['assign_to_members'],
    tools: ['assign_checklist', 'create_checklist_from_template'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'checklist.complete_task',
    domain: 'checklists',
    intent: 'complete_checklist_task',
    name: 'Complete Task',
    description: 'Mark a checklist task as complete',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `TASK:
- Title: {{task_title}}
- Checklist: {{checklist_name}}
- Job: {{job_title}}
- Assigned: {{assigned_to}}

COMPLETION:
- Notes: {{completion_notes}}
- Photo: {{has_photo}}`,
      task: `Mark this task as complete with the provided details.`,
      constraints: `- Log completion time
- Associate current user
- Update checklist progress`,
      outputFormat: `Task completed:
- Timestamp
- Checklist progress: [X/Y]
- Time tracked: [if applicable]`,
    },
    requiredContext: ['task_data', 'completion_data'],
    optionalContext: ['photo_data', 'timesheet_entry'],
    tools: ['complete_checklist_task', 'upload_task_photo'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'checklist.view_progress',
    domain: 'checklists',
    intent: 'view_checklist_progress',
    name: 'View Checklist Progress',
    description: 'View completion progress of a checklist',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `CHECKLIST: {{checklist_name}}
JOB: {{job_title}}

PROGRESS:
- Completed: {{completed_count}}/{{total_count}} ({{progress_percent}}%)

ITEMS:
{{#each items}}
- [{{status}}] {{title}}
  {{#if completed_by}}Completed by {{completed_by}} at {{completed_at}}{{/if}}
{{/each}}`,
      task: `Present the checklist progress with item status.`,
      constraints: '',
      outputFormat: `Progress overview with status per item.`,
    },
    requiredContext: ['checklist_data', 'items'],
    optionalContext: [],
    tools: ['get_checklist_progress'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'checklist.generate_from_photo',
    domain: 'checklists',
    intent: 'generate_checklist_from_photo',
    name: 'Generate Checklist from Photo',
    description: 'Use AI vision to generate checklist items from a photo',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `JOB: {{job_title}}
PHOTO: {{photo_description}}

SERVICE TYPE: {{service_type}}
EXISTING ITEMS: {{existing_item_count}}`,
      task: `Analyze the photo and suggest checklist items for this job.`,
      constraints: `- Focus on visible tasks
- Prioritize safety items
- Be specific and actionable`,
      outputFormat: `Suggested items:
1. [Item] - [reason visible in photo]
2. [Item] - [reason]
...
Create these items? [Yes/No]`,
    },
    requiredContext: ['job_data', 'photo_data'],
    optionalContext: ['service_type', 'existing_checklist'],
    tools: ['analyze_photo', 'generate_checklist_items'],
    riskLevel: 'low',
    requiresConfirmation: true,
  },
];

// =============================================================================
// TIME TRACKING DOMAIN TEMPLATES
// =============================================================================

const TIME_TRACKING_TEMPLATES: PromptTemplate[] = [
  {
    id: 'time.clock_in',
    domain: 'time_tracking',
    intent: 'clock_in',
    name: 'Clock In',
    description: 'Start time tracking for a job',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `USER: {{user_name}}
CURRENT STATUS: {{current_clock_status}}

{{#if job_id}}
JOB:
- Title: {{job_title}}
- Customer: {{customer_name}}
- Scheduled: {{scheduled_time}}
{{/if}}`,
      task: `Clock in the user for work.`,
      constraints: `- Cannot clock in if already clocked in
- Link to job if provided
- Record GPS location if available`,
      outputFormat: `Clocked in:
- Time: [timestamp]
- Job: [title or "General"]
- Location: [if tracked]`,
    },
    requiredContext: ['user_data'],
    optionalContext: ['job_data', 'location'],
    tools: ['clock_in', 'get_current_timesheet'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'time.clock_out',
    domain: 'time_tracking',
    intent: 'clock_out',
    name: 'Clock Out',
    description: 'Stop time tracking',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `USER: {{user_name}}
CLOCKED IN: {{clock_in_time}}
DURATION: {{current_duration}}
JOB: {{current_job}}`,
      task: `Clock out the user and record the time entry.`,
      constraints: `- Must be clocked in
- Calculate duration
- Close timesheet entry`,
      outputFormat: `Clocked out:
- Duration: [time]
- Job: [title]
- Entry saved`,
    },
    requiredContext: ['user_data', 'timesheet_entry'],
    optionalContext: ['notes'],
    tools: ['clock_out', 'save_timesheet_entry'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'time.log_time',
    domain: 'time_tracking',
    intent: 'log_time',
    name: 'Log Time Entry',
    description: 'Manually log a time entry',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `TIME ENTRY:
- User: {{user_name}}
- Date: {{entry_date}}
- Start: {{start_time}}
- End: {{end_time}}
- Job: {{job_title}}
- Notes: {{notes}}`,
      task: `Create a manual time entry with the provided details.`,
      constraints: `- Validate time range
- No overlapping entries
- Link to job if provided`,
      outputFormat: `Time logged:
- Duration: [hours]
- Job: [title]
- Entry created`,
    },
    requiredContext: ['entry_details'],
    optionalContext: ['job_data'],
    tools: ['create_time_entry'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'time.view_timesheet',
    domain: 'time_tracking',
    intent: 'view_timesheet',
    name: 'View Timesheet',
    description: 'View timesheet for a period',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `TIMESHEET: {{user_name}}
PERIOD: {{date_range}}

ENTRIES:
{{#each entries}}
- {{date}}: {{start_time}} - {{end_time}} ({{duration}}) - {{job_title}}
{{/each}}

TOTALS:
- Total Hours: {{total_hours}}
- Billable: {{billable_hours}}`,
      task: `Present the timesheet for the requested period.`,
      constraints: '',
      outputFormat: `Timesheet summary with entries and totals.`,
    },
    requiredContext: ['user_data', 'date_range', 'entries'],
    optionalContext: [],
    tools: ['get_timesheet'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'time.time_report',
    domain: 'time_tracking',
    intent: 'generate_time_report',
    name: 'Generate Time Report',
    description: 'Generate a time tracking report',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `REPORT PARAMETERS:
- Date Range: {{date_range}}
- Group By: {{group_by}}
- Include: {{include_filters}}

DATA:
{{report_data}}`,
      task: `Generate a time tracking report with the specified parameters.`,
      constraints: '',
      outputFormat: `Report with totals, breakdowns, and trends.`,
    },
    requiredContext: ['date_range', 'report_params'],
    optionalContext: ['filters'],
    tools: ['generate_time_report'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
];

// =============================================================================
// RECURRING BILLING DOMAIN TEMPLATES
// =============================================================================

const RECURRING_TEMPLATES: PromptTemplate[] = [
  {
    id: 'recurring.create_schedule',
    domain: 'recurring_billing',
    intent: 'create_recurring_schedule',
    name: 'Create Recurring Schedule',
    description: 'Set up a recurring billing schedule',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `CUSTOMER: {{customer_name}}
QUOTE: {{quote_number}} (\${{quote_total}})

RECURRING SETTINGS:
- Frequency: {{frequency}}
- Start Date: {{start_date}}
- Auto-charge: {{auto_charge}}`,
      task: `Create a recurring billing schedule for this customer.`,
      constraints: `- Valid frequency options
- Stripe customer required for auto-charge
- Set appropriate reminders`,
      outputFormat: `Schedule created:
- ID
- Next billing: [date]
- Auto-charge: [enabled/disabled]`,
    },
    requiredContext: ['customer_data', 'quote_data', 'schedule_settings'],
    optionalContext: ['stripe_customer'],
    tools: ['create_recurring_schedule'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'recurring.pause',
    domain: 'recurring_billing',
    intent: 'pause_subscription',
    name: 'Pause Subscription',
    description: 'Temporarily pause a recurring schedule',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `SUBSCRIPTION:
- Customer: {{customer_name}}
- Frequency: {{frequency}}
- Next Billing: {{next_billing_date}}

PAUSE REQUEST:
- Duration: {{pause_duration}}
- Reason: {{pause_reason}}`,
      task: `Pause this recurring billing schedule.`,
      constraints: `- Set resume date
- Notify customer
- Update Stripe if applicable`,
      outputFormat: `Subscription paused:
- Resumes: [date]
- Customer notified: [yes/no]`,
    },
    requiredContext: ['subscription_data', 'pause_details'],
    optionalContext: [],
    tools: ['pause_subscription', 'notify_customer'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'recurring.resume',
    domain: 'recurring_billing',
    intent: 'resume_subscription',
    name: 'Resume Subscription',
    description: 'Resume a paused recurring schedule',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `PAUSED SUBSCRIPTION:
- Customer: {{customer_name}}
- Paused Since: {{paused_date}}
- Original Frequency: {{frequency}}`,
      task: `Resume this recurring billing schedule.`,
      constraints: `- Calculate next billing date
- Reactivate Stripe subscription
- Notify customer`,
      outputFormat: `Subscription resumed:
- Next billing: [date]
- Customer notified: [yes/no]`,
    },
    requiredContext: ['subscription_data'],
    optionalContext: [],
    tools: ['resume_subscription', 'notify_customer'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    id: 'recurring.cancel',
    domain: 'recurring_billing',
    intent: 'cancel_subscription',
    name: 'Cancel Subscription',
    description: 'Permanently cancel a recurring schedule',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `SUBSCRIPTION TO CANCEL:
- Customer: {{customer_name}}
- Active Since: {{start_date}}
- Invoices Generated: {{invoice_count}}
- Total Billed: \${{total_billed}}

CANCELLATION:
- Reason: {{cancel_reason}}
- Effective: {{cancel_date}}`,
      task: `Cancel this recurring billing schedule.`,
      constraints: `- Handle prorated refunds if needed
- Cancel in Stripe
- Notify customer`,
      outputFormat: `Subscription cancelled:
- Effective: [date]
- Refund: [if applicable]
- Customer notified: [yes]`,
    },
    requiredContext: ['subscription_data', 'cancel_details'],
    optionalContext: ['refund_amount'],
    tools: ['cancel_subscription', 'process_refund', 'notify_customer'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },
];

// =============================================================================
// SERVICE REQUEST DOMAIN TEMPLATES
// =============================================================================

const REQUEST_TEMPLATES: PromptTemplate[] = [
  {
    id: 'request.create',
    domain: 'service_request',
    intent: 'create_request',
    name: 'Create Service Request',
    description: 'Create a new service request',
    template: {
      role: ROLE_FRAGMENTS.customerService,
      context: `CUSTOMER: {{customer_name}}
REQUEST DETAILS:
- Type: {{request_type}}
- Description: {{description}}
- Urgency: {{urgency}}
- Source: {{source}}`,
      task: `Create a new service request and begin triage.`,
      constraints: CONSTRAINT_FRAGMENTS.dataIntegrity,
      outputFormat: `Request created:
- Request ID
- Status: New
- Next: Triage/Assign`,
    },
    requiredContext: ['customer_data', 'request_details'],
    optionalContext: ['photos', 'preferred_date'],
    tools: ['create_request'],
    riskLevel: 'low',
    requiresConfirmation: false,
    followUpIntents: ['triage_request', 'convert_request_to_job'],
  },
  {
    id: 'request.triage',
    domain: 'service_request',
    intent: 'triage_request',
    name: 'Triage Request',
    description: 'Review and prioritize a service request',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `REQUEST:
- ID: {{request_id}}
- Customer: {{customer_name}}
- Type: {{request_type}}
- Description: {{description}}
- Submitted: {{created_at}}

TRIAGE OPTIONS:
- Priority: [1-5]
- Category: [list]
- Action: [Quote/Schedule/Reject]`,
      task: `Triage this request and determine next steps.`,
      constraints: `- Assess urgency
- Check customer history
- Route appropriately`,
      outputFormat: `Triaged:
- Priority: [level]
- Action: [Quote/Schedule Direct/Need Info]
- Assigned to: [if applicable]`,
    },
    requiredContext: ['request_data', 'customer_history'],
    optionalContext: ['similar_requests'],
    tools: ['update_request', 'assign_request'],
    riskLevel: 'low',
    requiresConfirmation: false,
    followUpIntents: ['create_quote', 'create_job'],
  },
  {
    id: 'request.convert_to_job',
    domain: 'service_request',
    intent: 'convert_request_to_job',
    name: 'Convert Request to Job',
    description: 'Convert a service request directly to a job',
    template: {
      role: ROLE_FRAGMENTS.operations,
      context: `REQUEST:
- ID: {{request_id}}
- Customer: {{customer_name}}
- Description: {{description}}
- Address: {{service_address}}`,
      task: `Convert this request directly to a job for scheduling.`,
      constraints: `- Copy all relevant details
- Link to original request
- Set initial status`,
      outputFormat: `Job created:
- Job ID
- From Request: {{request_id}}
- Ready for scheduling`,
    },
    requiredContext: ['request_data'],
    optionalContext: ['estimated_duration', 'assigned_team'],
    tools: ['convert_request_to_job', 'schedule_job'],
    riskLevel: 'low',
    requiresConfirmation: true,
    followUpIntents: ['schedule_job'],
  },
];

// =============================================================================
// CUSTOMER PORTAL DOMAIN TEMPLATES
// =============================================================================

const PORTAL_TEMPLATES: PromptTemplate[] = [
  {
    id: 'portal.view_messages',
    domain: 'customer_portal',
    intent: 'view_portal_messages',
    name: 'View Portal Messages',
    description: 'View messages from customers in the portal',
    template: {
      role: ROLE_FRAGMENTS.customerService,
      context: `MESSAGES:
{{#each conversations}}
CONVERSATION: {{customer_name}}
{{#each messages}}
- [{{timestamp}}] {{sender}}: {{content}}
{{/each}}
---
{{/each}}`,
      task: `Review and summarize customer portal messages.`,
      constraints: '',
      outputFormat: `Message summary with urgent items highlighted.`,
    },
    requiredContext: ['conversations'],
    optionalContext: ['unread_count'],
    tools: ['get_portal_messages', 'mark_as_read'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'portal.customer_approve_quote',
    domain: 'customer_portal',
    intent: 'customer_approve_quote',
    name: 'Customer Quote Approval',
    description: 'Handle customer approving a quote via portal',
    template: {
      role: ROLE_FRAGMENTS.sales,
      context: `QUOTE APPROVED:
- Quote #: {{quote_number}}
- Customer: {{customer_name}}
- Total: \${{quote_total}}
- Approved At: {{approval_timestamp}}
- Signature: {{has_signature}}`,
      task: `Process this customer quote approval.`,
      constraints: `- Verify signature if required
- Trigger next workflow
- Send confirmation`,
      outputFormat: `Approval processed:
- Quote status: Approved
- Next step: [Create Job / Create Invoice]
- Confirmation sent: [yes]`,
    },
    requiredContext: ['quote_data', 'approval_data'],
    optionalContext: ['signature_data'],
    tools: ['process_quote_approval', 'create_job_from_quote', 'create_invoice_from_quote'],
    riskLevel: 'medium',
    requiresConfirmation: false,
    followUpIntents: ['create_job', 'create_invoice'],
  },
  {
    id: 'portal.customer_make_payment',
    domain: 'customer_portal',
    intent: 'customer_make_payment',
    name: 'Customer Portal Payment',
    description: 'Handle customer making a payment via portal',
    template: {
      role: ROLE_FRAGMENTS.finance,
      context: `PAYMENT RECEIVED:
- Invoice #: {{invoice_number}}
- Amount: \${{payment_amount}}
- Method: {{payment_method}}
- Customer: {{customer_name}}`,
      task: `Process this customer portal payment.`,
      constraints: `- Verify payment
- Update invoice
- Send receipt`,
      outputFormat: `Payment processed:
- Receipt sent: [yes]
- Invoice status: [Partial/Paid]`,
    },
    requiredContext: ['invoice_data', 'payment_data'],
    optionalContext: [],
    tools: ['process_portal_payment', 'send_receipt'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    id: 'portal.customer_request_reschedule',
    domain: 'customer_portal',
    intent: 'customer_request_reschedule',
    name: 'Customer Reschedule Request',
    description: 'Handle customer requesting to reschedule a job',
    template: {
      role: ROLE_FRAGMENTS.scheduler,
      context: `RESCHEDULE REQUEST:
- Job: {{job_title}}
- Current Date: {{current_date}}
- Customer: {{customer_name}}
- Requested Date: {{requested_date}}
- Reason: {{reason}}`,
      task: `Review and process this reschedule request.`,
      constraints: `- Check availability
- Confirm with customer
- Update schedule`,
      outputFormat: `Request processed:
- Status: [Approved/Needs Review]
- New date: [if approved]
- Customer notified: [yes]`,
    },
    requiredContext: ['job_data', 'request_data'],
    optionalContext: ['available_slots'],
    tools: ['check_availability', 'reschedule_job', 'notify_customer'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
];

// =============================================================================
// GENERAL/FALLBACK TEMPLATE
// =============================================================================

const GENERAL_TEMPLATE: PromptTemplate = {
  id: 'general.help',
  domain: 'customer_acquisition', // Fallback to a valid domain
  intent: 'general_help',
  name: 'General Help',
  description: 'Handle general questions and requests',
  template: {
    role: ROLE_FRAGMENTS.general,
    context: `CURRENT PAGE: {{current_page}}
RECENT ACTIONS: {{recent_actions}}
BUSINESS CONTEXT: {{business_name}} ({{business_type}})`,
    task: `Help the user with their request. If it's not clear what they need, ask clarifying questions.`,
    constraints: `- Stay within scope of available tools
- Suggest relevant features
- Provide helpful guidance`,
    outputFormat: `Helpful response with clear next steps or questions for clarification.`,
  },
  requiredContext: ['business_name'],
  optionalContext: ['current_page', 'recent_actions'],
  tools: [],
  riskLevel: 'low',
  requiresConfirmation: false,
};

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

export const PROMPT_TEMPLATES: PromptTemplateRegistry = {
  // Scheduling
  ...Object.fromEntries(SCHEDULING_TEMPLATES.map(t => [t.id, t])),
  
  // Quotes
  ...Object.fromEntries(QUOTE_TEMPLATES.map(t => [t.id, t])),
  
  // Jobs
  ...Object.fromEntries(JOB_TEMPLATES.map(t => [t.id, t])),
  
  // Invoices
  ...Object.fromEntries(INVOICE_TEMPLATES.map(t => [t.id, t])),
  
  // Customers
  ...Object.fromEntries(CUSTOMER_TEMPLATES.map(t => [t.id, t])),
  
  // Payments
  ...Object.fromEntries(PAYMENT_TEMPLATES.map(t => [t.id, t])),
  
  // Team
  ...Object.fromEntries(TEAM_TEMPLATES.map(t => [t.id, t])),
  
  // Checklists
  ...Object.fromEntries(CHECKLIST_TEMPLATES.map(t => [t.id, t])),
  
  // Time Tracking
  ...Object.fromEntries(TIME_TRACKING_TEMPLATES.map(t => [t.id, t])),
  
  // Recurring Billing
  ...Object.fromEntries(RECURRING_TEMPLATES.map(t => [t.id, t])),
  
  // Service Requests
  ...Object.fromEntries(REQUEST_TEMPLATES.map(t => [t.id, t])),
  
  // Customer Portal
  ...Object.fromEntries(PORTAL_TEMPLATES.map(t => [t.id, t])),
  
  // General
  [GENERAL_TEMPLATE.id]: GENERAL_TEMPLATE,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a prompt template by ID
 */
export function getPromptTemplate(templateId: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES[templateId];
}

/**
 * Get a prompt template for a specific intent
 */
export function getTemplateForIntent(domain: Domain, intent: string): PromptTemplate | undefined {
  const templateId = `${domain}.${intent}`;
  return PROMPT_TEMPLATES[templateId] || PROMPT_TEMPLATES['general.help'];
}

/**
 * Get all templates for a domain
 */
export function getTemplatesForDomain(domain: Domain): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES).filter(t => t.domain === domain);
}

/**
 * Get all high-risk templates that require confirmation
 */
export function getHighRiskTemplates(): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES).filter(t => t.riskLevel === 'high');
}

/**
 * Get required context keys for a template
 */
export function getRequiredContextKeys(templateId: string): string[] {
  const template = PROMPT_TEMPLATES[templateId];
  return template?.requiredContext || [];
}

/**
 * Get all context keys (required + optional) for a template
 */
export function getAllContextKeys(templateId: string): string[] {
  const template = PROMPT_TEMPLATES[templateId];
  if (!template) return [];
  return [...template.requiredContext, ...template.optionalContext];
}

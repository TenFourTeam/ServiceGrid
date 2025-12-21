import { Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  toolName?: string | null;
  className?: string;
}

const toolStatusMessages: Record<string, string> = {
  get_unscheduled_jobs: 'Finding unscheduled jobs...',
  check_team_availability: 'Checking team availability...',
  get_schedule_summary: 'Getting schedule summary...',
  auto_schedule_job: 'Auto-scheduling job...',
  create_job_from_request: 'Creating job from request...',
  optimize_route_for_date: 'Optimizing route...',
  get_scheduling_conflicts: 'Finding conflicts...',
  get_customer_details: 'Getting customer details...',
  update_job_status: 'Updating job status...',
  get_capacity_forecast: 'Forecasting capacity...',
  reschedule_job: 'Rescheduling job...',
  batch_schedule_jobs: 'Batch scheduling jobs...',
  refine_schedule: 'Refining schedule...',
  // Quote tools
  create_quote: 'Creating quote...',
  get_pending_quotes: 'Getting pending quotes...',
  send_quote: 'Sending quote...',
  convert_quote_to_job: 'Converting quote to job...',
  approve_quote: 'Approving quote...',
  decline_quote: 'Declining quote...',
  // Invoice tools
  create_invoice: 'Creating invoice...',
  get_unpaid_invoices: 'Getting unpaid invoices...',
  send_invoice: 'Sending invoice...',
  send_invoice_reminder: 'Sending reminder...',
  record_payment: 'Recording payment...',
  // Customer tools
  create_customer: 'Creating customer...',
  search_customers: 'Searching customers...',
  get_customer_history: 'Getting customer history...',
  invite_to_portal: 'Sending portal invite...',
  get_customer_messages: 'Getting messages...',
  send_customer_message: 'Sending message...',
  // Team tools
  get_team_members: 'Getting team members...',
  get_team_utilization: 'Calculating utilization...',
  invite_team_member: 'Sending invite...',
  update_team_availability: 'Updating availability...',
  request_time_off: 'Submitting request...',
  approve_time_off: 'Processing request...',
  // Time tracking tools
  clock_in: 'Clocking in...',
  clock_out: 'Clocking out...',
  log_time_entry: 'Logging time...',
  get_active_clockins: 'Checking clock-ins...',
  get_timesheet_summary: 'Getting timesheet...',
  // Checklist tools
  get_checklist_templates: 'Getting templates...',
  assign_checklist_to_job: 'Assigning checklist...',
  get_job_checklist_progress: 'Checking progress...',
  create_checklist_template: 'Creating template...',
  complete_checklist_item: 'Completing item...',
  // Recurring billing
  get_recurring_schedules: 'Getting subscriptions...',
  pause_subscription: 'Pausing subscription...',
  resume_subscription: 'Resuming subscription...',
  create_recurring_schedule: 'Creating schedule...',
  cancel_subscription: 'Canceling subscription...',
  // Navigation & intelligence
  navigate_to_entity: 'Navigating...',
  navigate_to_calendar: 'Opening calendar...',
  lookup_entity: 'Searching...',
  get_suggested_actions: 'Getting suggestions...',
  undo_last_action: 'Undoing action...',
  // Batch operations
  send_job_confirmations: 'Sending confirmations...',
  batch_send_reminders: 'Sending reminders...',
  batch_create_invoices: 'Creating invoices...',
  batch_update_job_status: 'Updating jobs...',
  get_business_metrics: 'Loading metrics...',
};

export function TypingIndicator({ toolName, className }: TypingIndicatorProps) {
  const statusMessage = toolName ? toolStatusMessages[toolName] : null;

  return (
    <div className={cn('flex gap-3 mb-4 animate-in fade-in duration-200', className)}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary" />
      </div>

      {/* Typing bubble - minimal design */}
      <div className="flex-1 min-w-0">
        <div className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-muted">
          {/* Animated dots */}
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          {statusMessage && (
            <span className="text-xs text-muted-foreground ml-1">
              {statusMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

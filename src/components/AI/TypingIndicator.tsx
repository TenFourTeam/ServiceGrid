import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  toolName?: string | null;
  className?: string;
}

const toolStatusMessages: Record<string, string> = {
  get_unscheduled_jobs: 'Finding jobs',
  check_team_availability: 'Checking availability',
  get_schedule_summary: 'Getting schedule',
  auto_schedule_job: 'Scheduling',
  create_job_from_request: 'Creating job',
  optimize_route_for_date: 'Optimizing route',
  get_scheduling_conflicts: 'Checking conflicts',
  get_customer_details: 'Loading customer',
  update_job_status: 'Updating',
  get_capacity_forecast: 'Forecasting',
  reschedule_job: 'Rescheduling',
  batch_schedule_jobs: 'Batch scheduling',
  refine_schedule: 'Refining',
  create_quote: 'Creating quote',
  get_pending_quotes: 'Loading quotes',
  send_quote: 'Sending quote',
  convert_quote_to_job: 'Converting',
  approve_quote: 'Approving',
  decline_quote: 'Declining',
  create_invoice: 'Creating invoice',
  get_unpaid_invoices: 'Loading invoices',
  send_invoice: 'Sending invoice',
  send_invoice_reminder: 'Sending reminder',
  record_payment: 'Recording payment',
  create_customer: 'Creating customer',
  search_customers: 'Searching',
  get_customer_history: 'Loading history',
  invite_to_portal: 'Sending invite',
  get_customer_messages: 'Loading messages',
  send_customer_message: 'Sending',
  get_team_members: 'Loading team',
  get_team_utilization: 'Calculating',
  invite_team_member: 'Inviting',
  update_team_availability: 'Updating',
  request_time_off: 'Submitting',
  approve_time_off: 'Processing',
  clock_in: 'Clocking in',
  clock_out: 'Clocking out',
  log_time_entry: 'Logging',
  get_active_clockins: 'Checking',
  get_timesheet_summary: 'Loading timesheet',
  get_checklist_templates: 'Loading templates',
  assign_checklist_to_job: 'Assigning',
  get_job_checklist_progress: 'Checking',
  create_checklist_template: 'Creating',
  complete_checklist_item: 'Completing',
  get_recurring_schedules: 'Loading',
  pause_subscription: 'Pausing',
  resume_subscription: 'Resuming',
  create_recurring_schedule: 'Creating',
  cancel_subscription: 'Canceling',
  navigate_to_entity: 'Navigating',
  navigate_to_calendar: 'Opening',
  lookup_entity: 'Searching',
  get_suggested_actions: 'Thinking',
  undo_last_action: 'Undoing',
  send_job_confirmations: 'Sending',
  batch_send_reminders: 'Sending',
  batch_create_invoices: 'Creating',
  batch_update_job_status: 'Updating',
  get_business_metrics: 'Loading',
};

export function TypingIndicator({ toolName, className }: TypingIndicatorProps) {
  const statusMessage = toolName ? toolStatusMessages[toolName] : null;

  return (
    <div className={cn('flex gap-3 mb-5 animate-fade-in', className)}>
      {/* Avatar with gradient */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
        <Bot className="w-4 h-4 text-primary" />
      </div>

      {/* Typing bubble with gradient */}
      <div className="flex-1 min-w-0">
        <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 bg-gradient-to-br from-muted to-muted/50 border border-border/30">
          {/* Animated typing dots */}
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary/50 animate-[bounce_1s_ease-in-out_infinite]" />
            <span className="w-2 h-2 rounded-full bg-primary/50 animate-[bounce_1s_ease-in-out_infinite_150ms]" />
            <span className="w-2 h-2 rounded-full bg-primary/50 animate-[bounce_1s_ease-in-out_infinite_300ms]" />
          </div>
          
          {/* Status message with icon */}
          {statusMessage && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary/60" />
              <span className="text-xs text-muted-foreground font-medium">
                {statusMessage}...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

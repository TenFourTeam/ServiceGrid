import {
  Calendar,
  Users,
  MapPin,
  Clock,
  FileText,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Zap,
  CheckCircle2,
  Plus,
  Edit,
  XCircle,
  Trash2,
  Send,
  Eye,
  Search,
  Navigation,
  ClipboardList,
  Receipt,
  CreditCard,
  DollarSign,
  Mail,
  Phone,
  MessageSquare,
  UserPlus,
  CalendarCheck,
  CalendarX,
  Timer,
  PlayCircle,
  StopCircle,
  RotateCcw,
  Lightbulb,
  Settings,
  Package,
  Repeat,
  Ban,
  Image,
  Database,
  Activity,
  BarChart3,
} from 'lucide-react';

// Complete tool icon map for all ~60 tools
export const toolIconMap: Record<string, any> = {
  // === SCHEDULING TOOLS ===
  get_unscheduled_jobs: Calendar,
  check_team_availability: Users,
  get_schedule_summary: FileText,
  auto_schedule_job: Calendar,
  create_job_from_request: FileText,
  optimize_route_for_date: MapPin,
  get_scheduling_conflicts: AlertCircle,
  reschedule_job: RefreshCw,
  batch_schedule_jobs: Zap,
  preview_schedule_changes: Eye,
  refine_schedule: RefreshCw,
  
  // === JOB TOOLS ===
  create_job: Plus,
  update_job: Edit,
  update_job_status: CheckCircle2,
  cancel_job: XCircle,
  get_job_details: Eye,
  assign_team_member: UserPlus,
  
  // === CUSTOMER TOOLS ===
  get_customer_details: Users,
  create_customer: UserPlus,
  update_customer: Edit,
  search_customers: Search,
  get_customer_messages: MessageSquare,
  send_customer_message: Send,
  
  // === QUOTE TOOLS ===
  create_quote: FileText,
  update_quote: Edit,
  delete_quote: Trash2,
  approve_quote: CheckCircle2,
  decline_quote: XCircle,
  send_quote: Send,
  
  // === INVOICE TOOLS ===
  create_invoice: Receipt,
  update_invoice: Edit,
  void_invoice: Ban,
  send_invoice: Send,
  get_invoice_details: Eye,
  
  // === PAYMENT TOOLS ===
  record_payment: DollarSign,
  process_stripe_payment: CreditCard,
  refund_payment: RotateCcw,
  
  // === TIME TRACKING TOOLS ===
  clock_in: PlayCircle,
  clock_out: StopCircle,
  log_time_entry: Timer,
  get_time_entries: Clock,
  
  // === TEAM TOOLS ===
  invite_team_member: UserPlus,
  update_team_availability: CalendarCheck,
  request_time_off: CalendarX,
  approve_time_off: CheckCircle2,
  get_team_schedule: Users,
  
  // === CHECKLIST TOOLS ===
  create_checklist_template: ClipboardList,
  complete_checklist_item: CheckCircle2,
  generate_checklist_from_photo: Image,
  
  // === REQUEST TOOLS ===
  get_pending_requests: ClipboardList,
  create_request: Plus,
  update_request: Edit,
  
  // === RECURRING BILLING TOOLS ===
  create_recurring_schedule: Repeat,
  cancel_subscription: Ban,
  get_recurring_schedules: Repeat,
  
  // === NAVIGATION TOOLS ===
  navigate_to_entity: Navigation,
  navigate_to_calendar: Calendar,
  
  // === UTILITY TOOLS ===
  lookup_entity: Search,
  get_suggested_actions: Lightbulb,
  undo_last_action: RotateCcw,
  
  // === ANALYTICS TOOLS ===
  get_capacity_forecast: TrendingUp,
  get_revenue_summary: BarChart3,
  get_activity_log: Activity,
  
  // === EMAIL TOOLS ===
  send_email: Mail,
  send_reminder: Mail,
  
  // === INVENTORY TOOLS ===
  get_inventory: Package,
  update_inventory: Package,
  
  // === SETTINGS TOOLS ===
  get_business_settings: Settings,
  update_settings: Settings,
};

// Complete tool label map for all ~60 tools
export const toolLabelMap: Record<string, string> = {
  // === SCHEDULING TOOLS ===
  get_unscheduled_jobs: 'Finding unscheduled jobs',
  check_team_availability: 'Checking team availability',
  get_schedule_summary: 'Getting schedule summary',
  auto_schedule_job: 'Auto-scheduling job',
  create_job_from_request: 'Creating job from request',
  optimize_route_for_date: 'Optimizing route',
  get_scheduling_conflicts: 'Finding conflicts',
  reschedule_job: 'Rescheduling job',
  batch_schedule_jobs: 'Scheduling multiple jobs with AI',
  preview_schedule_changes: 'Previewing schedule changes',
  refine_schedule: 'Refining schedule based on feedback',
  
  // === JOB TOOLS ===
  create_job: 'Creating job',
  update_job: 'Updating job',
  update_job_status: 'Updating job status',
  cancel_job: 'Cancelling job',
  get_job_details: 'Getting job details',
  assign_team_member: 'Assigning team member',
  
  // === CUSTOMER TOOLS ===
  get_customer_details: 'Getting customer details',
  create_customer: 'Creating customer',
  update_customer: 'Updating customer',
  search_customers: 'Searching customers',
  get_customer_messages: 'Getting customer messages',
  send_customer_message: 'Sending message to customer',
  
  // === QUOTE TOOLS ===
  create_quote: 'Creating quote',
  update_quote: 'Updating quote',
  delete_quote: 'Deleting quote',
  approve_quote: 'Approving quote',
  decline_quote: 'Declining quote',
  send_quote: 'Sending quote',
  
  // === INVOICE TOOLS ===
  create_invoice: 'Creating invoice',
  update_invoice: 'Updating invoice',
  void_invoice: 'Voiding invoice',
  send_invoice: 'Sending invoice',
  get_invoice_details: 'Getting invoice details',
  
  // === PAYMENT TOOLS ===
  record_payment: 'Recording payment',
  process_stripe_payment: 'Processing card payment',
  refund_payment: 'Processing refund',
  
  // === TIME TRACKING TOOLS ===
  clock_in: 'Clocking in',
  clock_out: 'Clocking out',
  log_time_entry: 'Logging time entry',
  get_time_entries: 'Getting time entries',
  
  // === TEAM TOOLS ===
  invite_team_member: 'Inviting team member',
  update_team_availability: 'Updating availability',
  request_time_off: 'Requesting time off',
  approve_time_off: 'Approving time off',
  get_team_schedule: 'Getting team schedule',
  
  // === CHECKLIST TOOLS ===
  create_checklist_template: 'Creating checklist template',
  complete_checklist_item: 'Completing checklist item',
  generate_checklist_from_photo: 'Generating checklist from photo',
  
  // === REQUEST TOOLS ===
  get_pending_requests: 'Getting pending requests',
  create_request: 'Creating request',
  update_request: 'Updating request',
  
  // === RECURRING BILLING TOOLS ===
  create_recurring_schedule: 'Creating recurring schedule',
  cancel_subscription: 'Cancelling subscription',
  get_recurring_schedules: 'Getting recurring schedules',
  
  // === NAVIGATION TOOLS ===
  navigate_to_entity: 'Navigating to page',
  navigate_to_calendar: 'Opening calendar',
  
  // === UTILITY TOOLS ===
  lookup_entity: 'Looking up entity',
  get_suggested_actions: 'Getting suggestions',
  undo_last_action: 'Undoing last action',
  
  // === ANALYTICS TOOLS ===
  get_capacity_forecast: 'Forecasting capacity',
  get_revenue_summary: 'Getting revenue summary',
  get_activity_log: 'Getting activity log',
  
  // === EMAIL TOOLS ===
  send_email: 'Sending email',
  send_reminder: 'Sending reminder',
  
  // === INVENTORY TOOLS ===
  get_inventory: 'Getting inventory',
  update_inventory: 'Updating inventory',
  
  // === SETTINGS TOOLS ===
  get_business_settings: 'Getting settings',
  update_settings: 'Updating settings',
};

// Get tool info with fallback
export function getToolInfo(toolName: string) {
  return {
    icon: toolIconMap[toolName] || Clock,
    label: toolLabelMap[toolName] || toolName.replace(/_/g, ' '),
  };
}

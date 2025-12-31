import { 
  Calendar, 
  CalendarPlus, 
  Route, 
  AlertTriangle, 
  BarChart2, 
  Zap, 
  Users, 
  CheckCircle, 
  Plus, 
  Send, 
  ArrowRight, 
  DollarSign, 
  Bell, 
  UserPlus, 
  Briefcase, 
  FileText, 
  History, 
  Clock, 
  HelpCircle,
  LucideIcon
} from 'lucide-react';

export interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  shortLabel?: string;
  aiPrompt: string;
}

export const quickActionsByPage: Record<string, QuickAction[]> = {
  '/requests': [
    { id: 'capture_lead', icon: UserPlus, label: 'Capture Lead', shortLabel: 'Lead', aiPrompt: 'I have a new lead to capture' },
    { id: 'schedule', icon: Calendar, label: 'Schedule Assessment', shortLabel: 'Schedule', aiPrompt: 'Schedule an assessment for the selected request' },
    { id: 'quote', icon: FileText, label: 'Create Quote', shortLabel: 'Quote', aiPrompt: 'Create a quote from this request' },
    { id: 'convert', icon: ArrowRight, label: 'Convert to Job', shortLabel: 'Convert', aiPrompt: 'Convert this request into a job' },
  ],
  '/calendar': [
    { id: 'schedule', icon: CalendarPlus, label: 'Schedule Job', shortLabel: 'Schedule', aiPrompt: 'Schedule pending jobs' },
    { id: 'optimize', icon: Route, label: 'Optimize Routes', shortLabel: 'Optimize', aiPrompt: 'Optimize routes for today' },
    { id: 'conflicts', icon: AlertTriangle, label: 'Find Conflicts', shortLabel: 'Conflicts', aiPrompt: 'Are there any scheduling conflicts?' },
    { id: 'capacity', icon: BarChart2, label: 'Check Capacity', shortLabel: 'Capacity', aiPrompt: 'Show team capacity for this week' },
  ],
  '/jobs': [
    { id: 'schedule', icon: Calendar, label: 'Schedule', aiPrompt: 'Schedule the selected job' },
    { id: 'auto-schedule', icon: Zap, label: 'Auto-Schedule All', shortLabel: 'Auto', aiPrompt: 'Auto-schedule all pending jobs' },
    { id: 'assign', icon: Users, label: 'Assign Team', shortLabel: 'Assign', aiPrompt: 'Assign team members to this job' },
    { id: 'complete', icon: CheckCircle, label: 'Mark Complete', shortLabel: 'Complete', aiPrompt: 'Mark this job as complete' },
  ],
  '/quotes': [
    { id: 'create', icon: Plus, label: 'Create Quote', shortLabel: 'Create', aiPrompt: 'Help me create a new quote' },
    { id: 'send', icon: Send, label: 'Send Quote', shortLabel: 'Send', aiPrompt: 'Send the selected quote to the customer' },
    { id: 'approve', icon: CheckCircle, label: 'Approve', aiPrompt: 'Approve the selected quote' },
    { id: 'convert', icon: ArrowRight, label: 'Convert to Job', shortLabel: 'Convert', aiPrompt: 'Convert this quote to a job' },
  ],
  '/invoices': [
    { id: 'create', icon: Plus, label: 'Create Invoice', shortLabel: 'Create', aiPrompt: 'Help me create a new invoice' },
    { id: 'send', icon: Send, label: 'Send Invoice', shortLabel: 'Send', aiPrompt: 'Send the selected invoice to the customer' },
    { id: 'payment', icon: DollarSign, label: 'Record Payment', shortLabel: 'Payment', aiPrompt: 'Record a payment for this invoice' },
    { id: 'reminder', icon: Bell, label: 'Send Reminder', shortLabel: 'Remind', aiPrompt: 'Send a payment reminder for overdue invoices' },
  ],
  '/customers': [
    { id: 'capture_lead', icon: UserPlus, label: 'Capture Lead', shortLabel: 'Lead', aiPrompt: 'I have a new lead to capture' },
    { id: 'qualify', icon: CheckCircle, label: 'Qualify Lead', shortLabel: 'Qualify', aiPrompt: 'Help me qualify this lead' },
    { id: 'job', icon: Briefcase, label: 'Create Job', shortLabel: 'Job', aiPrompt: 'Create a job for this customer' },
    { id: 'quote', icon: FileText, label: 'Create Quote', shortLabel: 'Quote', aiPrompt: 'Create a quote for this customer' },
  ],
  '/team': [
    { id: 'availability', icon: Calendar, label: 'Availability', aiPrompt: 'Show team availability for this week' },
    { id: 'assign', icon: UserPlus, label: 'Assign Jobs', shortLabel: 'Assign', aiPrompt: 'Help me assign pending jobs to team members' },
    { id: 'schedule', icon: Clock, label: 'View Schedule', shortLabel: 'Schedule', aiPrompt: 'Show this team member\'s schedule' },
  ],
};

const defaultActions: QuickAction[] = [
  { id: 'help', icon: HelpCircle, label: 'Help', aiPrompt: 'What can you help me with on this page?' },
];

export function getQuickActionsForPage(path: string): QuickAction[] {
  // Match exact path first
  if (quickActionsByPage[path]) {
    return quickActionsByPage[path];
  }
  
  // Match by prefix (e.g., /jobs/123 matches /jobs)
  for (const [route, actions] of Object.entries(quickActionsByPage)) {
    if (path.startsWith(route + '/')) {
      return actions;
    }
  }
  
  return defaultActions;
}

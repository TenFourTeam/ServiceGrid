/**
 * AI Agent Orchestrator
 * 
 * The brain that ties intent classification, context loading, and prompt building together.
 * Implements the OODA (Observe, Orient, Decide, Act) loop for intelligent automation.
 */

import { loadContext, LoaderContext, LoadedContext } from './context-loader.ts';
import { 
  resolveReference, 
  MemoryContext, 
  getConversationState, 
  setConversationState,
  clearConversationState,
  type ConversationState 
} from './memory-manager.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface SessionContext {
  businessId: string;
  userId: string;
  currentPage?: string;
  recentActions?: string[];
  entityId?: string;
  entityType?: string;
}

export interface ClassifiedIntent {
  intentId: string;
  domain: string;
  confidence: number;
  entities: Record<string, any>;
  requiresClarification: boolean;
  clarificationData?: ClarificationData;
  isFollowUp?: boolean;  // True if this is a follow-up to a previous AI question
}

// Message type for conversation history
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OrchestratorResult {
  type: 'ready' | 'clarification' | 'confirmation';
  intent?: ClassifiedIntent;
  systemPrompt?: string;
  tools?: string[];
  context?: LoadedContext;
  clarificationData?: ClarificationData;
  confirmationRequest?: {
    action: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

// =============================================================================
// INTENT PATTERNS (Simplified classifier for edge function)
// =============================================================================

interface IntentPattern {
  intentId: string;
  domain: string;
  patterns: RegExp[];
  keywords: string[];
  requiredContext: string[];
  optionalContext: string[];
  tools: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // ============================================
  // SCHEDULING DOMAIN
  // ============================================
  // Single job scheduling - matches "schedule a job", "let's schedule a job", etc.
  {
    intentId: 'scheduling.single_job',
    domain: 'scheduling',
    patterns: [
      /(?:let's|let us|can you|please|I want to|I need to|help me)?\s*schedule\s+(a\s+)?job/i,
      /schedule\s+(?:this|that|one)\s+job/i,
      /I\s+need\s+to\s+schedule/i,
      /help\s+(?:me\s+)?schedule/i,
    ],
    keywords: ['schedule', 'job', 'schedule job', 'schedule a job'],
    requiredContext: ['unscheduled_jobs'],
    optionalContext: ['team_members', 'team_availability'],
    tools: ['get_unscheduled_jobs', 'auto_schedule_job'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  // Batch scheduling - matches "schedule all jobs", "batch schedule", etc.
  {
    intentId: 'scheduling.batch_schedule',
    domain: 'scheduling',
    patterns: [
      /schedule\s+(all|the|these|my)\s+(pending|unscheduled)?\s*jobs?/i,
      /batch\s+schedul/i,
      /auto[\s-]?schedule/i,
      /schedule\s+everything/i,
    ],
    keywords: ['schedule', 'batch', 'all jobs', 'pending', 'optimize schedule'],
    requiredContext: ['unscheduled_jobs', 'team_members'],
    optionalContext: ['team_availability', 'time_off_requests', 'business_constraints'],
    tools: ['get_unscheduled_jobs', 'batch_schedule_jobs', 'check_team_availability'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  {
    intentId: 'scheduling.view_schedule',
    domain: 'scheduling',
    patterns: [
      /what('s| is)\s+(on\s+)?(my|the|our)\s+schedule/i,
      /show\s+(me\s+)?(the\s+)?schedule/i,
      /what\s+jobs?\s+(are\s+)?(scheduled|today|this week)/i,
      /calendar\s+overview/i,
    ],
    keywords: ['schedule', 'calendar', 'today', 'this week', 'overview'],
    requiredContext: ['todays_jobs', 'scheduled_jobs_this_week'],
    optionalContext: ['team_members'],
    tools: ['get_schedule_summary', 'get_capacity_forecast'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'scheduling.check_availability',
    domain: 'scheduling',
    patterns: [
      /who('s| is)\s+(available|free)/i,
      /check\s+(team\s+)?availability/i,
      /available\s+team\s+members?/i,
    ],
    keywords: ['available', 'free', 'availability', 'who can'],
    requiredContext: ['team_members', 'team_availability'],
    optionalContext: ['time_off_requests', 'todays_jobs'],
    tools: ['check_team_availability', 'get_team_utilization'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'scheduling.reschedule',
    domain: 'scheduling',
    patterns: [
      /reschedule\s+(the\s+)?job/i,
      /move\s+(the\s+)?job\s+to/i,
      /change\s+(the\s+)?appointment/i,
    ],
    keywords: ['reschedule', 'move', 'change time', 'different day'],
    requiredContext: ['job_data'],
    optionalContext: ['team_availability'],
    tools: ['reschedule_job', 'check_team_availability'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    intentId: 'scheduling.optimize_route',
    domain: 'scheduling',
    patterns: [
      /optimize\s+(the\s+)?route/i,
      /best\s+route/i,
      /minimize\s+(travel|driving)/i,
    ],
    keywords: ['route', 'optimize', 'driving', 'travel time', 'efficient'],
    requiredContext: ['todays_jobs'],
    optionalContext: [],
    tools: ['optimize_route_for_date'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'scheduling.find_conflicts',
    domain: 'scheduling',
    patterns: [
      /find\s+(any\s+)?conflicts/i,
      /overlapping\s+(bookings?|jobs?)/i,
      /scheduling\s+conflicts/i,
    ],
    keywords: ['conflicts', 'overlap', 'double-booked'],
    requiredContext: ['scheduled_jobs_this_week'],
    optionalContext: [],
    tools: ['get_scheduling_conflicts'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // ============================================
  // JOB MANAGEMENT DOMAIN
  // ============================================
  {
    intentId: 'job.view_unscheduled',
    domain: 'job_management',
    patterns: [
      /unscheduled\s+jobs?/i,
      /pending\s+jobs?/i,
      /jobs?\s+(that\s+)?(need|require)\s+scheduling/i,
      /what\s+needs?\s+to\s+be\s+scheduled/i,
    ],
    keywords: ['unscheduled', 'pending', 'backlog', 'need scheduling'],
    requiredContext: ['unscheduled_jobs', 'unscheduled_jobs_count'],
    optionalContext: ['team_members'],
    tools: ['get_unscheduled_jobs'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'job.update_status',
    domain: 'job_management',
    patterns: [
      /mark\s+(the\s+)?job\s+(as\s+)?complete/i,
      /complete\s+(the\s+)?job/i,
      /update\s+(job\s+)?status/i,
      /set\s+status\s+to/i,
    ],
    keywords: ['complete', 'mark', 'status', 'done', 'finished'],
    requiredContext: ['job_data'],
    optionalContext: [],
    tools: ['update_job_status'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  {
    intentId: 'job.create_from_request',
    domain: 'job_management',
    patterns: [
      /convert\s+(the\s+)?request/i,
      /create\s+job\s+from\s+request/i,
      /turn\s+(this\s+)?request\s+into\s+(a\s+)?job/i,
    ],
    keywords: ['convert', 'request', 'create job'],
    requiredContext: [],
    optionalContext: ['team_members'],
    tools: ['create_job_from_request'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  {
    intentId: 'job.add_note',
    domain: 'job_management',
    patterns: [
      /add\s+(a\s+)?note\s+to\s+(the\s+)?job/i,
      /note\s+on\s+(the\s+)?job/i,
      /job\s+note/i,
    ],
    keywords: ['note', 'add note', 'job note'],
    requiredContext: ['job_data'],
    optionalContext: [],
    tools: ['add_job_note'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'job.assign_member',
    domain: 'job_management',
    patterns: [
      /assign\s+(a\s+)?(team\s+)?member\s+to/i,
      /assign\s+\w+\s+to\s+(the\s+)?job/i,
      /who\s+should\s+do\s+(this|the)\s+job/i,
    ],
    keywords: ['assign', 'team member', 'worker'],
    requiredContext: ['job_data', 'team_members'],
    optionalContext: ['team_availability'],
    tools: ['assign_job_to_member', 'get_team_members'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  {
    intentId: 'job.view_timeline',
    domain: 'job_management',
    patterns: [
      /job\s+(timeline|history|activity)/i,
      /what\s+happened\s+(on|with)\s+(this|the)\s+job/i,
    ],
    keywords: ['timeline', 'history', 'activity', 'events'],
    requiredContext: ['job_data'],
    optionalContext: [],
    tools: ['get_job_timeline'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'job.view_checklist',
    domain: 'job_management',
    patterns: [
      /checklist\s+(progress|status)/i,
      /job\s+checklist/i,
      /what('s| is)\s+been\s+completed/i,
    ],
    keywords: ['checklist', 'progress', 'tasks', 'completed'],
    requiredContext: ['job_data'],
    optionalContext: [],
    tools: ['get_job_checklist_progress'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // ============================================
  // CUSTOMER DOMAIN
  // ============================================
  {
    intentId: 'customer.view_details',
    domain: 'customer_acquisition',
    patterns: [
      /customer\s+(details?|info|information)/i,
      /tell\s+me\s+about\s+(the\s+)?customer/i,
      /who\s+is\s+this\s+customer/i,
    ],
    keywords: ['customer', 'details', 'info', 'history'],
    requiredContext: ['customer_data'],
    optionalContext: [],
    tools: ['get_customer_details', 'get_customer_history'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'customer.search',
    domain: 'customer_acquisition',
    patterns: [
      /search\s+(for\s+)?customers?/i,
      /find\s+(a\s+)?customer/i,
      /look\s+up\s+(a\s+)?customer/i,
    ],
    keywords: ['search', 'find', 'look up', 'customer'],
    requiredContext: [],
    optionalContext: [],
    tools: ['search_customers'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'customer.create',
    domain: 'customer_acquisition',
    patterns: [
      /create\s+(a\s+)?(new\s+)?customer/i,
      /add\s+(a\s+)?(new\s+)?customer/i,
      /new\s+customer/i,
    ],
    keywords: ['create', 'add', 'new', 'customer'],
    requiredContext: [],
    optionalContext: [],
    tools: ['create_customer'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  {
    intentId: 'customer.invite_portal',
    domain: 'customer_acquisition',
    patterns: [
      /invite\s+(the\s+)?customer\s+to\s+(the\s+)?portal/i,
      /send\s+(a\s+)?portal\s+invite/i,
      /give\s+(the\s+)?customer\s+portal\s+access/i,
    ],
    keywords: ['invite', 'portal', 'access'],
    requiredContext: ['customer_data'],
    optionalContext: [],
    tools: ['invite_to_portal'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },

  // ============================================
  // QUOTE DOMAIN
  // ============================================
  {
    intentId: 'quote.list_pending',
    domain: 'quote_lifecycle',
    patterns: [
      /pending\s+quotes?/i,
      /quotes?\s+(waiting|awaiting)/i,
      /open\s+quotes?/i,
      /quotes?\s+status/i,
    ],
    keywords: ['pending quotes', 'open quotes', 'waiting', 'quote status'],
    requiredContext: ['pending_quotes'],
    optionalContext: [],
    tools: ['get_pending_quotes'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'quote.create',
    domain: 'quote_lifecycle',
    patterns: [
      /create\s+(a\s+)?(new\s+)?quote/i,
      /generate\s+(a\s+)?quote/i,
      /make\s+(a\s+)?quote\s+for/i,
    ],
    keywords: ['create', 'new', 'quote', 'estimate'],
    requiredContext: ['customer_data'],
    optionalContext: [],
    tools: ['create_quote'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  {
    intentId: 'quote.send',
    domain: 'quote_lifecycle',
    patterns: [
      /send\s+(the\s+)?quote/i,
      /email\s+(the\s+)?quote/i,
      /deliver\s+(the\s+)?quote/i,
    ],
    keywords: ['send', 'email', 'quote'],
    requiredContext: [],
    optionalContext: [],
    tools: ['send_quote'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    intentId: 'quote.convert_to_job',
    domain: 'quote_lifecycle',
    patterns: [
      /convert\s+(the\s+)?quote\s+to\s+(a\s+)?job/i,
      /turn\s+(the\s+)?quote\s+into\s+(a\s+)?job/i,
      /create\s+job\s+from\s+(the\s+)?quote/i,
    ],
    keywords: ['convert', 'quote', 'job', 'work order'],
    requiredContext: [],
    optionalContext: ['team_members'],
    tools: ['convert_quote_to_job'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },

  // ============================================
  // INVOICE DOMAIN
  // ============================================
  {
    intentId: 'invoice.list_unpaid',
    domain: 'invoicing',
    patterns: [
      /unpaid\s+invoices?/i,
      /outstanding\s+(invoices?|balances?)/i,
      /who\s+owes\s+(us\s+)?money/i,
    ],
    keywords: ['unpaid', 'outstanding', 'overdue', 'owed'],
    requiredContext: ['unpaid_invoices'],
    optionalContext: ['overdue_invoices'],
    tools: ['get_unpaid_invoices'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'invoice.list_overdue',
    domain: 'invoicing',
    patterns: [
      /overdue\s+invoices?/i,
      /late\s+payments?/i,
      /past\s+due/i,
    ],
    keywords: ['overdue', 'late', 'past due'],
    requiredContext: ['overdue_invoices'],
    optionalContext: [],
    tools: ['get_unpaid_invoices'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'invoice.create',
    domain: 'invoicing',
    patterns: [
      /create\s+(a\s+)?(new\s+)?invoice/i,
      /generate\s+(an?\s+)?invoice/i,
      /bill\s+(the\s+)?customer/i,
    ],
    keywords: ['create', 'new', 'invoice', 'bill'],
    requiredContext: ['customer_data'],
    optionalContext: [],
    tools: ['create_invoice'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  {
    intentId: 'invoice.send',
    domain: 'invoicing',
    patterns: [
      /send\s+(the\s+)?invoice/i,
      /email\s+(the\s+)?invoice/i,
    ],
    keywords: ['send', 'email', 'invoice'],
    requiredContext: [],
    optionalContext: [],
    tools: ['send_invoice'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    intentId: 'invoice.send_reminder',
    domain: 'invoicing',
    patterns: [
      /send\s+(a\s+)?payment\s+reminder/i,
      /remind\s+(the\s+)?customer\s+to\s+pay/i,
      /follow\s+up\s+on\s+(the\s+)?invoice/i,
    ],
    keywords: ['reminder', 'remind', 'follow up', 'payment'],
    requiredContext: [],
    optionalContext: ['overdue_invoices'],
    tools: ['send_invoice_reminder'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },

  // ============================================
  // PAYMENT DOMAIN
  // ============================================
  {
    intentId: 'payment.record',
    domain: 'payment_processing',
    patterns: [
      /record\s+(a\s+)?payment/i,
      /mark\s+(as\s+)?paid/i,
      /received\s+payment/i,
      /log\s+(a\s+)?payment/i,
    ],
    keywords: ['record', 'payment', 'paid', 'received', 'cash', 'check'],
    requiredContext: [],
    optionalContext: ['unpaid_invoices'],
    tools: ['record_payment'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    intentId: 'payment.history',
    domain: 'payment_processing',
    patterns: [
      /payment\s+history/i,
      /payments?\s+(received|made)/i,
      /what\s+payments?\s+(have\s+)?been\s+received/i,
    ],
    keywords: ['payment history', 'payments received', 'transactions'],
    requiredContext: [],
    optionalContext: ['customer_data'],
    tools: ['get_payment_history'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // ============================================
  // RECURRING BILLING DOMAIN
  // ============================================
  {
    intentId: 'recurring.list',
    domain: 'recurring_billing',
    patterns: [
      /recurring\s+(schedules?|billing)/i,
      /subscriptions?/i,
      /recurring\s+customers?/i,
    ],
    keywords: ['recurring', 'subscription', 'schedules'],
    requiredContext: [],
    optionalContext: [],
    tools: ['get_recurring_schedules'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'recurring.pause',
    domain: 'recurring_billing',
    patterns: [
      /pause\s+(the\s+)?subscription/i,
      /pause\s+(the\s+)?recurring/i,
      /put\s+subscription\s+on\s+hold/i,
    ],
    keywords: ['pause', 'hold', 'subscription'],
    requiredContext: [],
    optionalContext: [],
    tools: ['pause_subscription'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },
  {
    intentId: 'recurring.resume',
    domain: 'recurring_billing',
    patterns: [
      /resume\s+(the\s+)?subscription/i,
      /reactivate\s+(the\s+)?subscription/i,
      /start\s+billing\s+again/i,
    ],
    keywords: ['resume', 'reactivate', 'restart'],
    requiredContext: [],
    optionalContext: [],
    tools: ['resume_subscription'],
    riskLevel: 'medium',
    requiresConfirmation: true,
  },

  // ============================================
  // TEAM MANAGEMENT DOMAIN
  // ============================================
  {
    intentId: 'team.list_members',
    domain: 'team_management',
    patterns: [
      /team\s+members?/i,
      /who('s| is)\s+on\s+(the\s+)?team/i,
      /list\s+(all\s+)?team/i,
    ],
    keywords: ['team', 'members', 'staff', 'employees'],
    requiredContext: ['team_members'],
    optionalContext: [],
    tools: ['get_team_members'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'team.utilization',
    domain: 'team_management',
    patterns: [
      /team\s+utilization/i,
      /who('s| is)\s+(the\s+)?busiest/i,
      /workload\s+(by\s+)?team/i,
      /how\s+busy\s+is\s+the\s+team/i,
    ],
    keywords: ['utilization', 'workload', 'busy', 'capacity'],
    requiredContext: ['team_members'],
    optionalContext: [],
    tools: ['get_team_utilization'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'team.active_clockins',
    domain: 'team_management',
    patterns: [
      /who('s| is)\s+clocked\s+in/i,
      /active\s+clock[\s-]?ins?/i,
      /who('s| is)\s+(currently\s+)?working/i,
    ],
    keywords: ['clocked in', 'working', 'active'],
    requiredContext: [],
    optionalContext: ['team_members'],
    tools: ['get_active_clockins'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'team.timesheet_summary',
    domain: 'team_management',
    patterns: [
      /timesheet\s+(summary|report)/i,
      /hours\s+worked/i,
      /time\s+tracking\s+report/i,
    ],
    keywords: ['timesheet', 'hours', 'time tracking'],
    requiredContext: [],
    optionalContext: ['team_members'],
    tools: ['get_timesheet_summary'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // ============================================
  // CHECKLIST DOMAIN
  // ============================================
  {
    intentId: 'checklist.list_templates',
    domain: 'checklists',
    patterns: [
      /checklist\s+templates?/i,
      /available\s+checklists?/i,
      /show\s+(me\s+)?checklists?/i,
    ],
    keywords: ['checklist', 'templates', 'available'],
    requiredContext: [],
    optionalContext: [],
    tools: ['get_checklist_templates'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'checklist.assign_to_job',
    domain: 'checklists',
    patterns: [
      /assign\s+(a\s+)?checklist\s+to\s+(the\s+)?job/i,
      /add\s+(a\s+)?checklist\s+to\s+(the\s+)?job/i,
      /attach\s+checklist/i,
    ],
    keywords: ['assign', 'add', 'checklist', 'job'],
    requiredContext: ['job_data'],
    optionalContext: [],
    tools: ['assign_checklist_to_job', 'get_checklist_templates'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },

  // ============================================
  // SERVICE REQUESTS DOMAIN
  // ============================================
  {
    intentId: 'request.list_pending',
    domain: 'service_request',
    patterns: [
      /pending\s+requests?/i,
      /new\s+requests?/i,
      /service\s+requests?/i,
      /incoming\s+requests?/i,
    ],
    keywords: ['requests', 'pending', 'new', 'incoming', 'service'],
    requiredContext: [],
    optionalContext: [],
    tools: ['get_requests_pending'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // ============================================
  // ANALYTICS DOMAIN
  // ============================================
  {
    intentId: 'analytics.capacity',
    domain: 'analytics',
    patterns: [
      /capacity\s+(forecast|overview)/i,
      /how\s+busy\s+(are\s+we|is\s+the\s+team)/i,
      /workload\s+(overview|status)/i,
      /utilization/i,
    ],
    keywords: ['capacity', 'busy', 'workload', 'utilization'],
    requiredContext: ['capacity_metrics', 'team_member_count'],
    optionalContext: ['unscheduled_jobs_count'],
    tools: ['get_capacity_forecast'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'analytics.business_metrics',
    domain: 'analytics',
    patterns: [
      /business\s+(metrics|stats|performance)/i,
      /how('s| is)\s+(the\s+)?business\s+doing/i,
      /kpis?/i,
      /revenue\s+(report|summary)/i,
    ],
    keywords: ['metrics', 'stats', 'performance', 'kpi', 'revenue'],
    requiredContext: [],
    optionalContext: [],
    tools: ['get_business_metrics'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // ============================================
  // GENERAL/FALLBACK
  // ============================================
  {
    intentId: 'general.greeting',
    domain: 'general',
    patterns: [
      /^(hi|hello|hey|good\s+(morning|afternoon|evening))/i,
      /^what\s+can\s+you\s+do/i,
      /^help$/i,
    ],
    keywords: ['hello', 'hi', 'help', 'what can you do'],
    requiredContext: ['business_name', 'unscheduled_jobs_count', 'todays_jobs_count'],
    optionalContext: ['recent_ai_activity'],
    tools: [],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  
  // ============================================
  // JOB CREATE/EDIT (Phase 1 addition)
  // ============================================
  {
    intentId: 'job.create',
    domain: 'job_management',
    patterns: [
      /create\s+(a\s+)?(new\s+)?job/i,
      /add\s+(a\s+)?(new\s+)?job/i,
      /new\s+job\s+for/i,
      /book\s+(a\s+)?job/i,
      /schedule\s+(a\s+)?new\s+job/i,
    ],
    keywords: ['create job', 'new job', 'add job', 'book job'],
    requiredContext: ['customer_data'],
    optionalContext: ['team_members'],
    tools: ['create_job', 'search_customers'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  {
    intentId: 'job.edit',
    domain: 'job_management',
    patterns: [
      /edit\s+(the\s+)?job/i,
      /update\s+(the\s+)?job/i,
      /change\s+(the\s+)?(job|address|time|date|notes)/i,
      /modify\s+(the\s+)?job/i,
    ],
    keywords: ['edit job', 'update job', 'change job', 'modify'],
    requiredContext: ['job_data'],
    optionalContext: [],
    tools: ['update_job'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  
  // ============================================
  // GENERAL CONFIRMATIONS/CANCELLATIONS (Phase 1 addition)
  // ============================================
  {
    intentId: 'general.confirm',
    domain: 'general',
    patterns: [
      /^(yes|yeah|yep|yup|ok|okay|sure|go ahead|do it|proceed|confirm|that's right|correct|absolutely|definitely)$/i,
      /^(sounds good|perfect|great|let's do it)$/i,
    ],
    keywords: ['yes', 'ok', 'go ahead', 'confirm', 'proceed'],
    requiredContext: [],
    optionalContext: [],
    tools: [],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'general.cancel',
    domain: 'general',
    patterns: [
      /^(no|nope|nah|cancel|stop|never\s*mind|forget it|don't)$/i,
      /^(not now|maybe later|skip)$/i,
    ],
    keywords: ['no', 'cancel', 'stop', 'never mind'],
    requiredContext: [],
    optionalContext: [],
    tools: [],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // ============================================
  // PHASE 3: ADDITIONAL JOB MANAGEMENT
  // ============================================
  {
    intentId: 'job.cancel',
    domain: 'job_management',
    patterns: [
      /cancel\s+(the\s+)?job/i,
      /delete\s+(the\s+)?job/i,
      /remove\s+(the\s+)?job/i,
    ],
    keywords: ['cancel', 'delete', 'remove', 'job'],
    requiredContext: ['job_data'],
    optionalContext: [],
    tools: ['cancel_job'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },

  // ============================================
  // PHASE 3: ADDITIONAL CUSTOMER MANAGEMENT
  // ============================================
  {
    intentId: 'customer.update',
    domain: 'customer_acquisition',
    patterns: [
      /update\s+(the\s+)?customer/i,
      /change\s+(the\s+)?(customer's?|their)\s+(phone|email|address|name)/i,
      /edit\s+(the\s+)?customer/i,
      /modify\s+(the\s+)?customer/i,
    ],
    keywords: ['update', 'change', 'edit', 'customer', 'phone', 'email', 'address'],
    requiredContext: ['customer_data'],
    optionalContext: [],
    tools: ['update_customer'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },

  // ============================================
  // PHASE 3: ADDITIONAL QUOTE MANAGEMENT
  // ============================================
  {
    intentId: 'quote.update',
    domain: 'quote_lifecycle',
    patterns: [
      /update\s+(the\s+)?quote/i,
      /edit\s+(the\s+)?quote/i,
      /add\s+(a\s+)?line\s+item/i,
      /modify\s+(the\s+)?quote/i,
      /extend\s+(the\s+)?quote/i,
    ],
    keywords: ['update', 'edit', 'add', 'line item', 'quote', 'extend'],
    requiredContext: [],
    optionalContext: [],
    tools: ['update_quote'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
  {
    intentId: 'quote.delete',
    domain: 'quote_lifecycle',
    patterns: [
      /delete\s+(the\s+)?quote/i,
      /remove\s+(the\s+)?quote/i,
      /discard\s+(the\s+)?quote/i,
    ],
    keywords: ['delete', 'remove', 'discard', 'quote'],
    requiredContext: [],
    optionalContext: [],
    tools: ['delete_quote'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },

  // ============================================
  // PHASE 3: ADDITIONAL INVOICE MANAGEMENT
  // ============================================
  {
    intentId: 'invoice.void',
    domain: 'invoicing',
    patterns: [
      /void\s+(the\s+)?invoice/i,
      /cancel\s+(the\s+)?invoice/i,
      /delete\s+(the\s+)?invoice/i,
    ],
    keywords: ['void', 'cancel', 'delete', 'invoice'],
    requiredContext: [],
    optionalContext: [],
    tools: ['void_invoice'],
    riskLevel: 'high',
    requiresConfirmation: true,
  },

  // ============================================
  // PHASE 3: NAVIGATION INTENTS
  // ============================================
  {
    intentId: 'navigation.entity',
    domain: 'general',
    patterns: [
      /take\s+me\s+to\s+(the\s+)?\w+/i,
      /go\s+to\s+(the\s+)?\w+/i,
      /show\s+me\s+(the\s+)?\w+'?s?\s+(page|profile|details)/i,
      /open\s+(the\s+)?\w+/i,
      /navigate\s+to\s+(the\s+)?\w+/i,
    ],
    keywords: ['take me', 'go to', 'show me', 'open', 'navigate', 'page', 'profile'],
    requiredContext: [],
    optionalContext: [],
    tools: ['navigate_to_entity', 'lookup_entity'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'navigation.calendar',
    domain: 'scheduling',
    patterns: [
      /show\s+(me\s+)?(the\s+)?calendar/i,
      /open\s+(the\s+)?calendar/i,
      /go\s+to\s+(the\s+)?calendar/i,
      /show\s+(me\s+)?(tomorrow|today|next\s+week)'?s?\s+schedule/i,
    ],
    keywords: ['calendar', 'schedule', 'tomorrow', 'today', 'next week'],
    requiredContext: [],
    optionalContext: [],
    tools: ['navigate_to_calendar'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // ============================================
  // PHASE 3: INTELLIGENCE INTENTS
  // ============================================
  {
    intentId: 'lookup.entity',
    domain: 'general',
    patterns: [
      /find\s+\w+/i,
      /search\s+for\s+\w+/i,
      /look\s+up\s+\w+/i,
      /where\s+is\s+(the\s+)?\w+/i,
    ],
    keywords: ['find', 'search', 'look up', 'where is', 'locate'],
    requiredContext: [],
    optionalContext: [],
    tools: ['lookup_entity'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'intelligence.suggestions',
    domain: 'general',
    patterns: [
      /what\s+should\s+i\s+do/i,
      /what\s+needs\s+(to\s+be\s+done|attention)/i,
      /suggest\s+(something|actions)/i,
      /any\s+recommendations/i,
      /what's\s+next/i,
    ],
    keywords: ['should', 'suggest', 'recommendations', 'what next', 'needs attention'],
    requiredContext: [],
    optionalContext: [],
    tools: ['get_suggested_actions'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'intelligence.undo',
    domain: 'general',
    patterns: [
      /undo\s+(that|last|the\s+last)/i,
      /reverse\s+(that|the\s+last)/i,
      /revert\s+(that|the\s+last)/i,
      /take\s+(that|it)\s+back/i,
    ],
    keywords: ['undo', 'reverse', 'revert', 'take back'],
    requiredContext: [],
    optionalContext: [],
    tools: ['undo_last_action'],
    riskLevel: 'medium',
    requiresConfirmation: false,
  },
];

// =============================================================================
// ENTITY EXTRACTION
// =============================================================================

function extractEntities(message: string): Record<string, any> {
  const entities: Record<string, any> = {};

  // Extract dates
  const datePatterns = [
    { pattern: /\b(today)\b/i, resolver: () => new Date().toISOString().split('T')[0] },
    { pattern: /\b(tomorrow)\b/i, resolver: () => new Date(Date.now() + 86400000).toISOString().split('T')[0] },
    { pattern: /\b(next\s+week)\b/i, resolver: () => {
      const next = new Date();
      next.setDate(next.getDate() + 7);
      return next.toISOString().split('T')[0];
    }},
    { pattern: /\b(\d{4}-\d{2}-\d{2})\b/, resolver: (m: string) => m },
    { pattern: /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/, resolver: (m: string) => {
      const [month, day, year] = m.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }},
  ];

  for (const { pattern, resolver } of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      entities.date = resolver(match[1]);
      break;
    }
  }

  // Extract job IDs (UUIDs)
  const uuidMatch = message.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  if (uuidMatch) {
    entities.entityId = uuidMatch[1];
  }

  // Extract counts
  const countMatch = message.match(/\b(all|\d+)\s+jobs?\b/i);
  if (countMatch) {
    entities.count = countMatch[1] === 'all' ? 'all' : parseInt(countMatch[1], 10);
  }

  // Extract time references
  const timeMatch = message.match(/\b(\d{1,2}):?(\d{2})?\s*(am|pm)?\b/i);
  if (timeMatch) {
    entities.time = timeMatch[0];
  }

  return entities;
}

// =============================================================================
// FOLLOW-UP DETECTION
// =============================================================================

/**
 * Detect if a message is a follow-up response to an AI question
 * rather than a new intent.
 * 
 * IMPROVED: Removed word count limit, added more data patterns,
 * and recognizes natural confirmations.
 */
function isFollowUpResponse(
  message: string,
  conversationHistory: ConversationMessage[],
  conversationState: ConversationState | null
): boolean {
  // If no pending intent, can't be a follow-up
  if (!conversationState?.pendingIntent || !conversationState?.awaitingInput) {
    return false;
  }

  // Get the last assistant message
  const lastAssistantMsg = [...conversationHistory]
    .reverse()
    .find(m => m.role === 'assistant');
  
  if (!lastAssistantMsg) return false;

  const lastContent = lastAssistantMsg.content.toLowerCase();
  const msgLower = message.toLowerCase().trim();

  // 1. Last assistant message was prompting for input (expanded patterns)
  const lastWasQuestion = lastContent.includes('?') || 
    /what\s+(is|are|was|were)\s+/i.test(lastContent) ||
    /could you (provide|tell|share|give)/i.test(lastContent) ||
    /please (provide|enter|share|give|tell)/i.test(lastContent) ||
    /what\'s the/i.test(lastContent) ||
    /which (customer|job|quote|invoice|team member)/i.test(lastContent) ||
    /who (is|should|would)/i.test(lastContent) ||
    /i need (the|a|some|more)/i.test(lastContent) ||
    /can you (provide|tell|share|give)/i.test(lastContent);

  // 2. Natural confirmations/affirmatives (expanded)
  const isConfirmation = /^(yes|no|yeah|yep|yup|nope|ok|okay|sure|correct|right|confirmed?|that's (right|correct|it)|go ahead|do it|proceed|sounds good|perfect|great|exactly|absolutely|of course|definitely|nah|not really|cancel|stop|never\s*mind)$/i.test(msgLower);
  if (isConfirmation) {
    console.info('[orchestrator] Follow-up detected: confirmation response');
    return true;
  }

  // 3. Message looks like data being provided (expanded patterns)
  const looksLikeData = 
    /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i.test(message) || // email
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(message) || // date (various formats)
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(message) || // phone
    /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/.test(message) || // phone (xxx) xxx-xxxx
    /\d+\s+[a-z]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place)/i.test(message) || // address
    /\$\s?\d+/i.test(message) || // dollar amount
    /\d+\s*(hour|hr|minute|min|hours|hrs|minutes|mins)/i.test(message) || // duration
    /net\s*\d+/i.test(message) || // payment terms
    /\d+\s*days?/i.test(message) || // due days
    /^\d+$/.test(msgLower.trim()) || // just a number
    /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(message.trim()); // looks like a name (Title Case)

  // 4. User message doesn't start with a command pattern
  const startsWithCommand = /^(schedule|create|show|list|find|search|cancel|delete|send|update|assign|reschedule|convert|generate|make|add|get|view|check|help|what|how|who|when|where|why|can you|could you|please|i want|i need|i'd like)/i.test(msgLower);
  
  // 5. If message contains ONLY data and last was a question, it's definitely a follow-up
  if (lastWasQuestion && looksLikeData && !startsWithCommand) {
    console.info('[orchestrator] Follow-up detected: data response to question');
    return true;
  }

  // 6. If we're awaiting input and message doesn't start with a command, likely a follow-up
  if (conversationState.awaitingInput && !startsWithCommand) {
    console.info('[orchestrator] Follow-up detected: awaiting input and no command pattern');
    return true;
  }
  
  // 7. If last was question and no command, likely a follow-up (regardless of length)
  if (lastWasQuestion && !startsWithCommand) {
    console.info('[orchestrator] Follow-up detected: question response without command');
    return true;
  }

  console.info('[orchestrator] Follow-up check:', {
    pendingIntent: conversationState.pendingIntent,
    awaitingInput: conversationState.awaitingInput,
    lastWasQuestion,
    looksLikeData,
    startsWithCommand,
    result: false
  });

  return false;
}

/**
 * Extract data entities from a follow-up response based on what we're awaiting
 */
function extractFollowUpEntities(
  message: string,
  awaitingInput: string
): Record<string, any> {
  const entities: Record<string, any> = {};
  
  // Extract based on what type of input we're awaiting
  switch (awaitingInput) {
    case 'customer_details':
    case 'customer_info': {
      // Extract email
      const emailMatch = message.match(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i);
      if (emailMatch) entities.email = emailMatch[1];
      
      // Extract phone
      const phoneMatch = message.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
      if (phoneMatch) entities.phone = phoneMatch[1];
      
      // The rest is likely the name - extract it
      let nameCandidate = message
        .replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, '') // remove email
        .replace(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, '') // remove phone
        .trim();
      if (nameCandidate) entities.name = nameCandidate;
      break;
    }
    
    case 'quote_line_items':
    case 'invoice_line_items': {
      // Extract line items from natural language
      // "AC repair $150, filter replacement $50" → [{description: 'AC repair', amount: 150}, ...]
      const lineItemPattern = /([^,$]+?)\s*\$\s?(\d+(?:\.\d{2})?)/gi;
      let match;
      const items: Array<{description: string, amount: number}> = [];
      while ((match = lineItemPattern.exec(message)) !== null) {
        items.push({ description: match[1].trim(), amount: parseFloat(match[2]) });
      }
      if (items.length > 0) {
        entities.lineItems = items;
      } else {
        // No dollar amounts found, treat whole message as description
        entities.description = message.trim();
      }
      break;
    }
    
    case 'amount': {
      const amountMatch = message.match(/\$?\s?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      if (amountMatch) entities.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      break;
    }
    
    case 'job_address':
    case 'address': {
      // Extract full address (everything that looks like an address)
      const addressPattern = /\d+\s+[a-z0-9\s,]+(?:st|street|ave|avenue|rd|road|blvd|dr|drive|ln|lane|ct|court|way|circle|pl|place)[^,]*(?:,\s*[a-z\s]+)?(?:,\s*[a-z]{2})?\s*\d{5}(?:-\d{4})?/i;
      const addrMatch = message.match(addressPattern);
      if (addrMatch) {
        entities.address = addrMatch[0];
      } else {
        // Use whole message as address
        entities.address = message.trim();
      }
      break;
    }
    
    case 'service_type': {
      entities.serviceType = message.trim();
      break;
    }
    
    case 'duration': {
      const durationMatch = message.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/i);
      if (durationMatch) {
        const value = parseFloat(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        entities.durationMinutes = unit.startsWith('h') ? Math.round(value * 60) : Math.round(value);
      } else {
        // Try just a number (assume hours)
        const numMatch = message.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) entities.durationMinutes = Math.round(parseFloat(numMatch[1]) * 60);
      }
      break;
    }
    
    case 'assignee': {
      // Store the name - will need to match to team member later
      entities.assigneeName = message.trim();
      break;
    }
    
    case 'invoice_terms': {
      const dueDaysMatch = message.match(/(\d+)\s*days?/i);
      if (dueDaysMatch) entities.dueDays = parseInt(dueDaysMatch[1]);
      const netMatch = message.match(/net\s*(\d+)/i);
      if (netMatch) entities.dueDays = parseInt(netMatch[1]);
      // Common terms
      if (/due on receipt|upon receipt/i.test(message)) entities.dueDays = 0;
      if (/net\s*15/i.test(message)) entities.dueDays = 15;
      if (/net\s*30/i.test(message)) entities.dueDays = 30;
      if (/net\s*60/i.test(message)) entities.dueDays = 60;
      break;
    }
    
    case 'description': {
      entities.description = message.trim();
      break;
    }
      
    case 'date':
    case 'schedule_date': {
      const dateEntities = extractEntities(message);
      if (dateEntities.date) entities.date = dateEntities.date;
      if (dateEntities.time) entities.time = dateEntities.time;
      break;
    }
      
    case 'confirmation': {
      const msgLower = message.toLowerCase().trim();
      entities.confirmed = /^(yes|yeah|yep|ok|okay|sure|correct|confirmed?|do it|go ahead)$/i.test(msgLower);
      entities.denied = /^(no|nope|cancel|stop|don't|nevermind)$/i.test(msgLower);
      break;
    }
      
    default:
      // General extraction
      Object.assign(entities, extractEntities(message));
  }
  
  console.info('[orchestrator] Extracted follow-up entities:', entities);
  return entities;
}

// =============================================================================
// INTENT CLASSIFICATION
// =============================================================================

function classifyIntent(message: string, sessionContext: SessionContext): ClassifiedIntent {
  const messageLower = message.toLowerCase().trim();
  let bestMatch: { pattern: IntentPattern; score: number } | null = null;

  for (const pattern of INTENT_PATTERNS) {
    let score = 0;

    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        score += 0.5;
        break;
      }
    }

    // Check keywords
    for (const keyword of pattern.keywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        score += 0.15;
      }
    }

    // Boost based on current page context
    if (sessionContext.currentPage) {
      const pageDomain = getPageDomain(sessionContext.currentPage);
      if (pageDomain === pattern.domain) {
        score += 0.2;
      }
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { pattern, score };
    }
  }

  const entities = extractEntities(message);
  const confidence = Math.min(bestMatch?.score || 0, 1);

  // Determine if clarification is needed (PHASE 2: Smart clarification)
  const requiresClarification = confidence < 0.4;
  let clarificationData: ClarificationData | undefined;

  if (requiresClarification) {
    // Build smart clarification with context-aware options
    const domain = bestMatch?.pattern.domain || 'general';
    clarificationData = buildSmartClarification(message, domain, sessionContext);
  }

  return {
    intentId: bestMatch?.pattern.intentId || 'general.unknown',
    domain: bestMatch?.pattern.domain || 'general',
    confidence,
    entities,
    requiresClarification,
    clarificationData,
  };
}

// =============================================================================
// SMART CLARIFICATION BUILDER (PHASE 2)
// =============================================================================

export interface ClarificationData {
  question: string;
  options: Array<{ label: string; value: string }>;
  domain: string;
}

/**
 * Builds a smart clarification response with contextual options
 * Returns structured data instead of text with [CLARIFY] tags.
 */
function buildSmartClarification(
  message: string,
  detectedDomain: string,
  sessionContext: SessionContext
): ClarificationData {
  // Determine domain from page context if not detected from message
  const pageDomain = sessionContext.currentPage ? getPageDomain(sessionContext.currentPage) : 'general';
  const domain = detectedDomain !== 'general' ? detectedDomain : pageDomain;
  
  // Special handling for scheduling-related messages
  const schedulingKeywords = /schedule|scheduling|book|calendar|job|appointment/i;
  if (schedulingKeywords.test(message)) {
    return {
      question: "I can help you with scheduling! What would you like to do?",
      options: [
        { label: 'Show jobs needing scheduling', value: 'Show me jobs that need scheduling' },
        { label: 'Schedule pending jobs', value: 'Schedule all pending jobs' },
        { label: 'Check team availability', value: 'Check team availability' },
        { label: 'Reschedule a job', value: 'Reschedule an existing job' }
      ],
      domain: 'scheduling'
    };
  }
  
  // Domain-specific structured options
  const domainOptions: Record<string, Array<{ label: string; value: string }>> = {
    scheduling: [
      { label: 'Jobs needing scheduling', value: 'Show me jobs that need scheduling' },
      { label: 'Schedule pending jobs', value: 'Schedule all pending jobs' },
      { label: 'Team availability', value: 'Check team availability' },
      { label: 'This week\'s schedule', value: 'Show this week\'s schedule' }
    ],
    job_management: [
      { label: 'Create new job', value: 'Create a new job' },
      { label: 'Unscheduled jobs', value: 'View unscheduled jobs' },
      { label: 'Update job status', value: 'Update a job status' },
      { label: 'Find a job', value: 'Find a specific job' }
    ],
    quote_lifecycle: [
      { label: 'Create quote', value: 'Create a new quote' },
      { label: 'Pending quotes', value: 'View pending quotes' },
      { label: 'Send a quote', value: 'Send a quote' },
      { label: 'Convert to job', value: 'Convert quote to job' }
    ],
    invoicing: [
      { label: 'Create invoice', value: 'Create a new invoice' },
      { label: 'Unpaid invoices', value: 'View unpaid invoices' },
      { label: 'Send reminders', value: 'Send invoice reminders' },
      { label: 'Record payment', value: 'Record a payment' }
    ],
    customer_acquisition: [
      { label: 'Add customer', value: 'Add a new customer' },
      { label: 'Search customers', value: 'Search for a customer' },
      { label: 'Customer history', value: 'View customer history' }
    ],
    team_management: [
      { label: 'Team members', value: 'View team members' },
      { label: 'Team utilization', value: 'Check team utilization' },
      { label: 'Active clock-ins', value: 'View active clock-ins' }
    ],
    general: [
      { label: 'Scheduling help', value: 'Help with scheduling' },
      { label: 'Quotes & invoices', value: 'Manage quotes or invoices' },
      { label: 'Customers', value: 'Customer management' },
      { label: 'Business metrics', value: 'View business metrics' }
    ]
  };
  
  const options = domainOptions[domain] || domainOptions.general;
  
  return {
    question: "I can help with that! What would you like to do?",
    options,
    domain
  };
}

function getPageDomain(page: string): string {
  const routes: Record<string, string> = {
    '/calendar': 'scheduling',
    '/work-orders': 'job_management',
    '/quotes': 'quote_lifecycle',
    '/invoices': 'invoicing',
    '/team': 'team_management',
    '/customers': 'customer_acquisition',
    '/requests': 'service_request',
  };

  for (const [route, domain] of Object.entries(routes)) {
    if (page.includes(route)) return domain;
  }
  return 'general';
}

// =============================================================================
// DYNAMIC PROMPT BUILDER
// =============================================================================

function buildDynamicSystemPrompt(
  intent: ClassifiedIntent,
  context: LoadedContext,
  sessionContext: SessionContext
): string {
  const businessName = context.business_name || 'your business';
  const currentDate = new Date().toISOString().split('T')[0];

  // Base role section
  let prompt = `You are a proactive AI scheduling assistant for ${businessName}, a service business management system.
You can both QUERY information and TAKE ACTIONS to help manage the business efficiently.

Current Context:
- Business ID: ${sessionContext.businessId}
- Current Page: ${sessionContext.currentPage || 'unknown'}
- Date: ${currentDate}
- Domain Focus: ${intent.domain}
`;

  // Add relevant context based on intent
  if (context.unscheduled_jobs_count !== undefined) {
    prompt += `- Unscheduled Jobs: ${context.unscheduled_jobs_count}\n`;
  }
  if (context.todays_jobs_count !== undefined) {
    prompt += `- Today's Jobs: ${context.todays_jobs_count}\n`;
  }
  if (context.team_member_count !== undefined) {
    prompt += `- Team Members: ${context.team_member_count}\n`;
  }
  if (context.capacity_metrics) {
    prompt += `- Capacity: ${context.capacity_metrics.utilizationPercent}% utilized (${context.capacity_metrics.capacityStatus})\n`;
  }

  // =========================================
  // INJECT ACTUAL LOADED CONTEXT DATA
  // =========================================
  
  // Unscheduled jobs list
  if (context.unscheduled_jobs?.length > 0) {
    prompt += `\n📋 UNSCHEDULED JOBS (${context.unscheduled_jobs.length}):\n`;
    prompt += context.unscheduled_jobs.slice(0, 10).map((j: any) => 
      `  • ${j.title || 'Untitled'} - ${j.customers?.name || 'No customer'} (Priority: ${j.priority || 'Normal'})`
    ).join('\n');
    if (context.unscheduled_jobs.length > 10) {
      prompt += `\n  ... and ${context.unscheduled_jobs.length - 10} more`;
    }
    prompt += '\n';
  }

  // Today's schedule
  if (context.todays_jobs?.length > 0) {
    prompt += `\n📅 TODAY'S SCHEDULE (${context.todays_jobs.length} jobs):\n`;
    prompt += context.todays_jobs.slice(0, 8).map((j: any) => {
      const time = j.starts_at ? new Date(j.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD';
      return `  • ${time} - ${j.title || 'Untitled'} (${j.status || 'Scheduled'})`;
    }).join('\n');
    prompt += '\n';
  }

  // Team members
  if (context.team_members?.length > 0) {
    prompt += `\n👥 TEAM MEMBERS (${context.team_members.length}):\n`;
    prompt += context.team_members.slice(0, 8).map((m: any) => 
      `  • ${m.name}`
    ).join('\n');
    prompt += '\n';
  }

  // Active clock-ins
  if (context.active_clockins?.length > 0) {
    prompt += `\n⏱️ CURRENTLY CLOCKED IN (${context.active_clockins.length}):\n`;
    prompt += context.active_clockins.map((c: any) => 
      `  • ${c.profiles?.full_name || 'Unknown'} - ${c.jobs?.title || 'No job assigned'}`
    ).join('\n');
    prompt += '\n';
  }

  // Pending quotes
  if (context.pending_quotes?.length > 0) {
    prompt += `\n📝 PENDING QUOTES (${context.pending_quotes.length}):\n`;
    prompt += context.pending_quotes.slice(0, 5).map((q: any) => 
      `  • ${q.number} - ${q.customers?.name || 'Unknown'} ($${q.total?.toFixed(2) || '0.00'})`
    ).join('\n');
    prompt += '\n';
  }

  // Unpaid invoices
  if (context.unpaid_invoices?.length > 0) {
    prompt += `\n💰 UNPAID INVOICES (${context.unpaid_invoices.length}):\n`;
    prompt += context.unpaid_invoices.slice(0, 5).map((inv: any) => 
      `  • ${inv.number} - ${inv.customers?.name || 'Unknown'} ($${inv.total?.toFixed(2) || '0.00'})`
    ).join('\n');
    prompt += '\n';
  }

  // Overdue invoices
  if (context.overdue_invoices?.length > 0) {
    prompt += `\n⚠️ OVERDUE INVOICES (${context.overdue_invoices.length}):\n`;
    prompt += context.overdue_invoices.slice(0, 5).map((inv: any) => 
      `  • ${inv.number} - ${inv.customers?.name || 'Unknown'} ($${inv.total?.toFixed(2) || '0.00'}) - Due: ${inv.due_at}`
    ).join('\n');
    prompt += '\n';
  }

  // Service requests pending
  if (context.service_requests_pending?.length > 0) {
    prompt += `\n📨 PENDING APPOINTMENT REQUESTS (${context.service_requests_pending.length}):\n`;
    prompt += context.service_requests_pending.slice(0, 5).map((r: any) => 
      `  • ${r.request_type} - ${r.customers?.name || 'Unknown'}`
    ).join('\n');
    prompt += '\n';
  }

  // Specific entity data (job, customer, quote, invoice)
  if (context.job_data) {
    const job = context.job_data;
    prompt += `\n🔧 CURRENT JOB:\n`;
    prompt += `  • Title: ${job.title || 'Untitled'}\n`;
    prompt += `  • Customer: ${job.customers?.name || 'Unknown'}\n`;
    prompt += `  • Status: ${job.status}\n`;
    prompt += `  • Address: ${job.address || job.customers?.address || 'Not set'}\n`;
    if (job.starts_at) prompt += `  • Scheduled: ${job.starts_at}\n`;
    prompt += '\n';
  }

  if (context.customer_data) {
    const cust = context.customer_data;
    prompt += `\n👤 CURRENT CUSTOMER:\n`;
    prompt += `  • Name: ${cust.name}\n`;
    prompt += `  • Email: ${cust.email || 'Not set'}\n`;
    prompt += `  • Phone: ${cust.phone || 'Not set'}\n`;
    prompt += `  • Jobs: ${cust.jobs?.length || 0}\n`;
    prompt += `  • Invoices: ${cust.invoices?.length || 0}\n`;
    prompt += '\n';
  }

  // Add domain-specific instructions
  prompt += getDomainInstructions(intent.domain);

  // Add scheduling workflow (always useful)
  prompt += getSchedulingWorkflowInstructions();

  // Add response style guidelines
  prompt += getResponseStyleGuidelines();

  return prompt;
}

function getDomainInstructions(domain: string): string {
  const instructions: Record<string, string> = {
    scheduling: `
SCHEDULING FOCUS:
You're currently helping with scheduling tasks. Prioritize:
- Finding optimal time slots
- Balancing team workload
- Minimizing travel time
- Respecting customer preferences
`,
    job_management: `
JOB MANAGEMENT FOCUS:
You're currently helping with job/work order management. Prioritize:
- Status updates
- Job details and history
- Customer information
- Scheduling connections
`,
    invoicing: `
INVOICING FOCUS:
You're currently helping with invoicing. Prioritize:
- Payment status
- Outstanding balances
- Invoice generation
- Payment reminders
`,
    customer_acquisition: `
CUSTOMER FOCUS:
You're currently helping with customer management. Prioritize:
- Customer details
- Service history
- Contact information
- Portal access
`,
  };

  return instructions[domain] || '';
}

function getSchedulingWorkflowInstructions(): string {
  return `
SCHEDULING WORKFLOW (IMPORTANT):
When user asks to schedule jobs, follow this flow:

1. FIRST: Use get_unscheduled_jobs to see what needs scheduling
   - Explain what you found (count, priorities, any urgent ones)

2. THEN: Offer to schedule them using batch_schedule_jobs
   - This is your MAIN scheduling tool - it considers team availability, travel time, and customer preferences

3. AFTER SCHEDULING: Show SCHEDULE_PREVIEW with results
   Format: [SCHEDULE_PREVIEW:{"scheduledJobs":[...],"totalJobsRequested":N,"estimatedTimeSaved":M}]

BATCH SCHEDULING INTELLIGENCE:
✅ Respects team availability and time off
✅ Groups jobs by location to minimize driving
✅ Honors customer preferred days/time windows
✅ Balances workload across team members
✅ Schedules urgent jobs first
`;
}

function getResponseStyleGuidelines(): string {
  return `
RESPONSE STYLE:
1. Be proactive and actionable - don't just inform, offer to act
2. Use clickable buttons: [BUTTON:message:Label|variant]
   Variants: primary (default), secondary, danger
3. Keep responses concise (2-4 sentences ideal)
4. Use emojis for visual hierarchy (✅ success, ⚠️ warnings, 📅 scheduling)
5. Explain AI reasoning when scheduling
6. Always confirm before cancellations or major changes

Example:
✅ Good: "Found 3 unscheduled jobs in the same area. I can schedule them back-to-back tomorrow morning. [BUTTON:Schedule these:Schedule All]"
❌ Bad: "There are some jobs that need scheduling. Would you like me to look into that?"
`;
}

// =============================================================================
// TOOL FILTERING
// =============================================================================

function getToolsForIntent(intent: ClassifiedIntent): string[] {
  const pattern = INTENT_PATTERNS.find((p) => p.intentId === intent.intentId);
  
  if (pattern) {
    return pattern.tools;
  }

  // Default tools for unknown intents
  return [
    'get_unscheduled_jobs',
    'get_schedule_summary',
    'check_team_availability',
    'get_customer_details',
  ];
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

export async function orchestrate(
  message: string,
  sessionContext: SessionContext,
  supabase: any,
  memoryContext?: MemoryContext,
  conversationHistory?: ConversationMessage[]
): Promise<OrchestratorResult> {
  console.info('[orchestrator] Processing message:', message.substring(0, 100));

  // Step 0: Check for follow-up to previous AI question (CRITICAL for multi-turn)
  let conversationState: ConversationState | null = null;
  if (memoryContext) {
    conversationState = await getConversationState(memoryContext);
    console.info('[orchestrator] Conversation state:', conversationState);
  }

  // Detect if this is a follow-up response to an AI question
  const isFollowUp = conversationHistory && conversationHistory.length > 0 &&
    isFollowUpResponse(message, conversationHistory, conversationState);

  let intent: ClassifiedIntent;

  if (isFollowUp && conversationState?.pendingIntent) {
    // This is a follow-up - use the pending intent instead of re-classifying
    console.info('[orchestrator] Detected FOLLOW-UP response to pending intent:', conversationState.pendingIntent);
    
    // Extract entities from the follow-up response
    const followUpEntities = extractFollowUpEntities(message, conversationState.awaitingInput || 'general');
    
    // Merge with previously collected entities
    const mergedEntities = {
      ...(conversationState.collectedEntities || {}),
      ...followUpEntities
    };

    intent = {
      intentId: conversationState.pendingIntent,
      domain: conversationState.pendingIntent.split('.')[0] || 'general',
      confidence: 1.0, // High confidence since we're continuing a flow
      entities: mergedEntities,
      requiresClarification: false,
      isFollowUp: true
    };

    // Update conversation state with merged entities
    if (memoryContext) {
      await setConversationState(memoryContext, {
        ...conversationState,
        collectedEntities: mergedEntities
      });
    }

    console.info('[orchestrator] Using pending intent with merged entities:', intent.intentId, mergedEntities);
  } else {
    // Standard intent classification
    intent = classifyIntent(message, sessionContext);
    console.info('[orchestrator] Classified intent:', intent.intentId, 'confidence:', intent.confidence);

    // Clear any stale conversation state if this is a new intent
    if (memoryContext && conversationState?.pendingIntent && intent.confidence > 0.5) {
      console.info('[orchestrator] New intent detected, clearing previous conversation state');
      await clearConversationState(memoryContext);
    }
  }

  // Step 2: Check if clarification is needed
  if (intent.requiresClarification) {
    // Store the pending state so we remember what we're asking about
    if (memoryContext) {
      await setConversationState(memoryContext, {
        pendingIntent: intent.intentId,
        awaitingInput: 'clarification',
        lastAssistantAction: 'asked_for_clarification',
        collectedEntities: intent.entities
      });
    }

    return {
      type: 'clarification',
      intent,
      clarificationData: intent.clarificationData || {
        question: 'Could you please provide more details?',
        options: [],
        domain: intent.domain
      },
    };
  }

  // Step 3: ORIENT - Load required context
  const pattern = INTENT_PATTERNS.find((p) => p.intentId === intent.intentId);
  const requiredKeys = pattern?.requiredContext || ['business_name'];
  const optionalKeys = pattern?.optionalContext || [];

  const loaderContext: LoaderContext = {
    supabase,
    businessId: sessionContext.businessId,
    userId: sessionContext.userId,
    currentPage: sessionContext.currentPage,
    entityId: intent.entities.entityId || sessionContext.entityId,
    entityType: sessionContext.entityType,
  };

  // Step 3a: Resolve entity references from memory if needed
  // If intent requires entity-specific context but no entityId was extracted, try memory
  if (memoryContext && !loaderContext.entityId) {
    const entityTypesNeeded: Array<'job' | 'customer' | 'quote' | 'invoice'> = [];
    
    if (requiredKeys.includes('job_data')) entityTypesNeeded.push('job');
    if (requiredKeys.includes('customer_data')) entityTypesNeeded.push('customer');
    if (requiredKeys.includes('quote_data')) entityTypesNeeded.push('quote');
    if (requiredKeys.includes('invoice_data')) entityTypesNeeded.push('invoice');
    
    for (const entityType of entityTypesNeeded) {
      const resolved = await resolveReference(memoryContext, entityType);
      if (resolved) {
        console.info(`[orchestrator] Resolved "${entityType}" from memory:`, resolved.entityId, resolved.entityName);
        loaderContext.entityId = resolved.entityId;
        loaderContext.entityType = entityType;
        break; // Use the first resolved entity
      }
    }
  }

  const loadedContext = await loadContext([...requiredKeys, ...optionalKeys], loaderContext);
  console.info('[orchestrator] Loaded context keys:', Object.keys(loadedContext));

  // Step 4: Check if confirmation is needed for high-risk actions
  if (pattern?.requiresConfirmation && pattern.riskLevel !== 'low') {
    // Store pending state for confirmation
    if (memoryContext) {
      await setConversationState(memoryContext, {
        pendingIntent: intent.intentId,
        awaitingInput: 'confirmation',
        lastAssistantAction: 'asked_for_confirmation',
        collectedEntities: intent.entities
      });
    }

    return {
      type: 'confirmation',
      intent,
      context: loadedContext,
      confirmationRequest: {
        action: intent.intentId,
        description: `This action will modify data. Are you sure you want to proceed?`,
        riskLevel: pattern.riskLevel,
      },
    };
  }

  // Step 5: DECIDE - Build dynamic prompt and select tools
  const systemPrompt = buildDynamicSystemPrompt(intent, loadedContext, sessionContext);
  const tools = getToolsForIntent(intent);

  console.info('[orchestrator] Ready with tools:', tools);

  return {
    type: 'ready',
    intent,
    systemPrompt,
    tools,
    context: loadedContext,
  };
}

/**
 * Get intent pattern by ID (for external use)
 */
export function getIntentPattern(intentId: string): IntentPattern | undefined {
  return INTENT_PATTERNS.find((p) => p.intentId === intentId);
}

/**
 * Get all available intent IDs
 */
export function getAllIntentIds(): string[] {
  return INTENT_PATTERNS.map((p) => p.intentId);
}

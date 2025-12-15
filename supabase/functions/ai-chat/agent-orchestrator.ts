/**
 * AI Agent Orchestrator
 * 
 * The brain that ties intent classification, context loading, and prompt building together.
 * Implements the OODA (Observe, Orient, Decide, Act) loop for intelligent automation.
 */

import { loadContext, LoaderContext, LoadedContext } from './context-loader.ts';
import { resolveReference, MemoryContext } from './memory-manager.ts';

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
  clarificationReason?: string;
}

export interface OrchestratorResult {
  type: 'ready' | 'clarification' | 'confirmation';
  intent?: ClassifiedIntent;
  systemPrompt?: string;
  tools?: string[];
  context?: LoadedContext;
  clarificationQuestion?: string;
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

  // Determine if clarification is needed
  const requiresClarification = confidence < 0.4;
  let clarificationReason: string | undefined;

  if (requiresClarification) {
    clarificationReason = 'I\'m not sure what you\'d like me to do. Could you be more specific?';
  }

  return {
    intentId: bestMatch?.pattern.intentId || 'general.unknown',
    domain: bestMatch?.pattern.domain || 'general',
    confidence,
    entities,
    requiresClarification,
    clarificationReason,
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
  memoryContext?: MemoryContext
): Promise<OrchestratorResult> {
  console.info('[orchestrator] Processing message:', message.substring(0, 100));

  // Step 1: OBSERVE - Classify intent
  const intent = classifyIntent(message, sessionContext);
  console.info('[orchestrator] Classified intent:', intent.intentId, 'confidence:', intent.confidence);

  // Step 2: Check if clarification is needed
  if (intent.requiresClarification) {
    return {
      type: 'clarification',
      intent,
      clarificationQuestion: intent.clarificationReason || 'Could you please provide more details?',
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

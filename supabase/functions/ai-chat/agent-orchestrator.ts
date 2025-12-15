/**
 * AI Agent Orchestrator
 * 
 * The brain that ties intent classification, context loading, and prompt building together.
 * Implements the OODA (Observe, Orient, Decide, Act) loop for intelligent automation.
 */

import { loadContext, LoaderContext, LoadedContext } from './context-loader.ts';

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
  // Scheduling Domain
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
    tools: ['check_team_availability'],
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

  // Job Management Domain
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

  // Customer Domain
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
    tools: ['get_customer_details'],
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    intentId: 'customer.list',
    domain: 'customer_acquisition',
    patterns: [
      /list\s+(all\s+)?customers?/i,
      /show\s+(me\s+)?customers?/i,
      /customer\s+list/i,
    ],
    keywords: ['customers', 'list', 'all customers'],
    requiredContext: ['customer_list'],
    optionalContext: [],
    tools: [],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // Quote Domain
  {
    intentId: 'quote.list_pending',
    domain: 'quote_lifecycle',
    patterns: [
      /pending\s+quotes?/i,
      /quotes?\s+(waiting|awaiting)/i,
      /open\s+quotes?/i,
    ],
    keywords: ['pending quotes', 'open quotes', 'waiting'],
    requiredContext: ['pending_quotes'],
    optionalContext: [],
    tools: [],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // Invoice Domain
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
    tools: [],
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
    tools: [],
    riskLevel: 'low',
    requiresConfirmation: false,
  },

  // Capacity/Analytics Domain
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

  // General/Fallback
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
  supabase: any
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

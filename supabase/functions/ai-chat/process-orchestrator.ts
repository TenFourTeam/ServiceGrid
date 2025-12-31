/**
 * Process Orchestrator
 * 
 * Coordinates multi-process workflows by:
 * - Detecting process completion and suggesting next steps
 * - Chaining processes with context handoff
 * - Tracking process journey state
 */

import type { ExecutionPlan } from './multi-step-planner.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface ProcessFlow {
  nextProcesses: string[];
  suggestNext: (result: Record<string, any>) => string | null;
  contextHandoff: string[];
}

export interface NextProcessSuggestion {
  processId: string;
  patternId: string;
  reason: string;
  contextToPass: Record<string, any>;
  fromProcess: string;
}

// =============================================================================
// PROCESS FLOW DEFINITIONS
// =============================================================================

export const PROCESS_FLOW: Record<string, ProcessFlow> = {
  lead_generation: {
    nextProcesses: ['communication', 'site_assessment', 'quoting'],
    suggestNext: (result: Record<string, any>) => {
      // If customer was created, suggest communication
      if (result.customer_id || result['create_customer']?.customer_id) {
        return 'communication';
      }
      return null;
    },
    contextHandoff: ['customerId', 'customer_id', 'requestId', 'request_id', 'leadScore', 'lead_score'],
  },
  communication: {
    nextProcesses: ['site_assessment', 'quoting', 'scheduling'],
    suggestNext: (_result: Record<string, any>) => {
      // After communication, suggest assessment
      return 'site_assessment';
    },
    contextHandoff: ['customerId', 'customer_id', 'conversationId', 'conversation_id'],
  },
  site_assessment: {
    nextProcesses: ['quoting'],
    suggestNext: () => 'quoting',
    contextHandoff: ['customerId', 'customer_id', 'jobId', 'job_id', 'assessmentData'],
  },
};

// Map pattern IDs to process IDs
const PATTERN_TO_PROCESS: Record<string, string> = {
  'complete_lead_generation': 'lead_generation',
  'customer_onboarding': 'lead_generation',
  'complete_customer_communication': 'communication',
  'complete_site_assessment': 'site_assessment',
  'quote_to_job_complete': 'quoting',
};

// Map process IDs to pattern IDs
const PROCESS_TO_PATTERN: Record<string, string> = {
  'lead_generation': 'complete_lead_generation',
  'communication': 'complete_customer_communication',
  'site_assessment': 'complete_site_assessment',
  'quoting': 'quote_to_job_complete',
};

// Human-readable process labels
const PROCESS_LABELS: Record<string, string> = {
  'lead_generation': 'Lead Capture',
  'communication': 'Customer Communication',
  'site_assessment': 'Site Assessment',
  'quoting': 'Quote & Job Creation',
  'scheduling': 'Job Scheduling',
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Detect which process a pattern belongs to
 */
export function getProcessFromPattern(patternId: string): string | null {
  return PATTERN_TO_PROCESS[patternId] || null;
}

/**
 * Get the pattern ID for a process
 */
export function getPatternForProcess(processId: string): string | null {
  return PROCESS_TO_PATTERN[processId] || null;
}

/**
 * Get human-readable label for a process
 */
export function getProcessLabel(processId: string): string {
  return PROCESS_LABELS[processId] || processId;
}

/**
 * Get suggested next process after completion
 */
export function getSuggestedNextProcess(
  completedProcess: string,
  planResult: Record<string, any>
): NextProcessSuggestion | null {
  const flow = PROCESS_FLOW[completedProcess];
  if (!flow) return null;
  
  const suggested = flow.suggestNext(planResult);
  if (!suggested) return null;
  
  const patternId = getPatternForProcess(suggested);
  if (!patternId) return null;
  
  // Extract context to pass
  const contextToPass = buildProcessContext(planResult, flow.contextHandoff);
  
  return {
    processId: suggested,
    patternId,
    reason: getTransitionReason(completedProcess, suggested),
    contextToPass,
    fromProcess: completedProcess,
  };
}

/**
 * Generate human-readable transition reason
 */
function getTransitionReason(from: string, to: string): string {
  const reasons: Record<string, string> = {
    'lead_generation->communication': 'New lead created — ready to contact customer',
    'lead_generation->site_assessment': 'Customer created — schedule an on-site assessment',
    'communication->site_assessment': 'Conversation established — schedule site visit',
    'communication->quoting': 'Customer ready for a quote',
    'site_assessment->quoting': 'Assessment complete — generate quote',
  };
  return reasons[`${from}->${to}`] || `Continue to ${getProcessLabel(to)}`;
}

/**
 * Build context for next process from previous result
 */
export function buildProcessContext(
  previousResult: Record<string, any>,
  handoffKeys: string[]
): Record<string, any> {
  const context: Record<string, any> = {};
  
  // Extract from nested result structures
  const extractFromObject = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if this key is in handoff list
      if (handoffKeys.includes(key) && value !== null && value !== undefined) {
        // Normalize key names (snake_case to camelCase)
        const normalizedKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        context[normalizedKey] = value;
        context[key] = value; // Keep original too
      }
      
      // Recurse into nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        extractFromObject(value);
      }
    }
  };
  
  extractFromObject(previousResult);
  return context;
}

/**
 * Track process journey in database
 */
export async function trackProcessJourney(
  supabase: any,
  businessId: string,
  userId: string,
  journey: {
    processId: string;
    status: 'started' | 'completed' | 'failed';
    planId?: string;
    context?: Record<string, any>;
  }
): Promise<void> {
  try {
    await supabase.from('ai_activity_log').insert({
      business_id: businessId,
      user_id: userId,
      activity_type: 'process_journey',
      description: `Process ${journey.processId} ${journey.status}`,
      metadata: {
        processId: journey.processId,
        status: journey.status,
        planId: journey.planId,
        context: journey.context,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[process-orchestrator] Failed to track journey:', error);
  }
}

/**
 * Get prompt text for starting a process
 */
export function getProcessPrompt(processId: string): string {
  const prompts: Record<string, string> = {
    'lead_generation': 'Capture a new lead',
    'communication': 'Contact the customer',
    'site_assessment': 'Schedule a site assessment',
    'quoting': 'Create a quote',
    'scheduling': 'Schedule the job',
  };
  return prompts[processId] || `Start ${getProcessLabel(processId)}`;
}

// =============================================================================
// PROCESS TRANSITION DETECTION
// =============================================================================

interface ProcessTransitionPattern {
  pattern: RegExp;
  targetProcess: string;
  extractContext?: (message: string) => Record<string, any>;
}

const PROCESS_TRANSITION_PATTERNS: ProcessTransitionPattern[] = [
  // Lead Gen -> Communication
  { pattern: /contact\s+(this|the)\s+(new\s+)?lead/i, targetProcess: 'communication' },
  { pattern: /reach\s+out\s+to\s+(this|the)\s+customer/i, targetProcess: 'communication' },
  { pattern: /send\s+(them|this\s+customer)\s+a\s+message/i, targetProcess: 'communication' },
  { pattern: /start\s+(a\s+)?conversation\s+with/i, targetProcess: 'communication' },
  { pattern: /message\s+(the|this)\s+customer/i, targetProcess: 'communication' },
  
  // Communication -> Site Assessment
  { pattern: /schedule\s+(an?\s+)?assessment\s+for\s+(this|the)\s+customer/i, targetProcess: 'site_assessment' },
  { pattern: /book\s+(a\s+)?site\s+visit/i, targetProcess: 'site_assessment' },
  { pattern: /schedule\s+(a\s+)?site\s+assessment/i, targetProcess: 'site_assessment' },
  
  // Lead Gen -> Site Assessment
  { pattern: /assess\s+(this|the)\s+(new\s+)?property/i, targetProcess: 'site_assessment' },
  
  // Any -> Quoting
  { pattern: /create\s+(a\s+)?quote\s+for\s+(this|the)/i, targetProcess: 'quoting' },
  { pattern: /generate\s+(a\s+)?quote/i, targetProcess: 'quoting' },
];

/**
 * Detect if a message indicates a process transition
 */
export function detectProcessTransition(
  message: string,
  currentContext: { customerId?: string; conversationId?: string; jobId?: string }
): { patternId: string; entities: Record<string, any> } | null {
  for (const { pattern, targetProcess } of PROCESS_TRANSITION_PATTERNS) {
    if (pattern.test(message)) {
      const patternId = getPatternForProcess(targetProcess);
      if (!patternId) continue;
      
      return {
        patternId,
        entities: { ...currentContext },
      };
    }
  }
  return null;
}

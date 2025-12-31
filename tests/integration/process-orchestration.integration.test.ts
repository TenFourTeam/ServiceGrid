/**
 * Process Orchestration Integration Tests
 * 
 * Tests the process orchestrator functions for coordinating multi-process workflows:
 * - Process ID mapping from patterns
 * - Next process suggestions with context handoff
 * - Process transition detection from user messages
 * - Context extraction for process chaining
 */

import { describe, it, expect } from 'vitest';

// Note: These functions are defined in the edge function, so we test the logic patterns
// In a real test environment, we'd import from the actual module

// =============================================================================
// MOCK IMPLEMENTATIONS (mirror the edge function logic for testing)
// =============================================================================

const PATTERN_TO_PROCESS: Record<string, string> = {
  'complete_lead_generation': 'lead_generation',
  'customer_onboarding': 'lead_generation',
  'complete_customer_communication': 'communication',
  'complete_site_assessment': 'site_assessment',
  'quote_to_job_complete': 'quoting',
};

const PROCESS_TO_PATTERN: Record<string, string> = {
  'lead_generation': 'complete_lead_generation',
  'communication': 'complete_customer_communication',
  'site_assessment': 'complete_site_assessment',
  'quoting': 'quote_to_job_complete',
};

const PROCESS_LABELS: Record<string, string> = {
  'lead_generation': 'Lead Capture',
  'communication': 'Customer Communication',
  'site_assessment': 'Site Assessment',
  'quoting': 'Quote & Job Creation',
  'scheduling': 'Job Scheduling',
};

interface ProcessFlow {
  nextProcesses: string[];
  suggestNext: (result: Record<string, any>) => string | null;
  contextHandoff: string[];
}

const PROCESS_FLOW: Record<string, ProcessFlow> = {
  lead_generation: {
    nextProcesses: ['communication', 'site_assessment', 'quoting'],
    suggestNext: (result: Record<string, any>) => {
      if (result.customer_id || result['create_customer']?.customer_id) {
        return 'communication';
      }
      return null;
    },
    contextHandoff: ['customerId', 'customer_id', 'requestId', 'request_id', 'leadScore', 'lead_score'],
  },
  communication: {
    nextProcesses: ['site_assessment', 'quoting', 'scheduling'],
    suggestNext: () => 'site_assessment',
    contextHandoff: ['customerId', 'customer_id', 'conversationId', 'conversation_id'],
  },
  site_assessment: {
    nextProcesses: ['quoting'],
    suggestNext: () => 'quoting',
    contextHandoff: ['customerId', 'customer_id', 'jobId', 'job_id', 'assessmentData'],
  },
};

function getProcessFromPattern(patternId: string): string | null {
  return PATTERN_TO_PROCESS[patternId] || null;
}

function getPatternForProcess(processId: string): string | null {
  return PROCESS_TO_PATTERN[processId] || null;
}

function getProcessLabel(processId: string): string {
  return PROCESS_LABELS[processId] || processId;
}

function buildProcessContext(
  previousResult: Record<string, any>,
  handoffKeys: string[]
): Record<string, any> {
  const context: Record<string, any> = {};
  
  const extractFromObject = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (handoffKeys.includes(key) && value !== null && value !== undefined) {
        const normalizedKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        context[normalizedKey] = value;
        context[key] = value;
      }
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        extractFromObject(value);
      }
    }
  };
  
  extractFromObject(previousResult);
  return context;
}

interface NextProcessSuggestion {
  processId: string;
  patternId: string;
  reason: string;
  contextToPass: Record<string, any>;
  fromProcess: string;
}

function getSuggestedNextProcess(
  completedProcess: string,
  planResult: Record<string, any>
): NextProcessSuggestion | null {
  const flow = PROCESS_FLOW[completedProcess];
  if (!flow) return null;
  
  const suggested = flow.suggestNext(planResult);
  if (!suggested) return null;
  
  const patternId = getPatternForProcess(suggested);
  if (!patternId) return null;
  
  const contextToPass = buildProcessContext(planResult, flow.contextHandoff);
  
  const reasons: Record<string, string> = {
    'lead_generation->communication': 'New lead created — ready to contact customer',
    'communication->site_assessment': 'Conversation established — schedule site visit',
    'site_assessment->quoting': 'Assessment complete — generate quote',
  };
  
  return {
    processId: suggested,
    patternId,
    reason: reasons[`${completedProcess}->${suggested}`] || `Continue to ${getProcessLabel(suggested)}`,
    contextToPass,
    fromProcess: completedProcess,
  };
}

interface ProcessTransitionPattern {
  pattern: RegExp;
  targetProcess: string;
}

const PROCESS_TRANSITION_PATTERNS: ProcessTransitionPattern[] = [
  { pattern: /contact\s+(this|the)\s+(new\s+)?lead/i, targetProcess: 'communication' },
  { pattern: /reach\s+out\s+to\s+(this|the)\s+customer/i, targetProcess: 'communication' },
  { pattern: /send\s+(them|this\s+customer)\s+a\s+message/i, targetProcess: 'communication' },
  { pattern: /start\s+(a\s+)?conversation\s+with/i, targetProcess: 'communication' },
  { pattern: /message\s+(the|this)\s+customer/i, targetProcess: 'communication' },
  { pattern: /schedule\s+(an?\s+)?assessment\s+for\s+(this|the)\s+customer/i, targetProcess: 'site_assessment' },
  { pattern: /book\s+(a\s+)?site\s+visit/i, targetProcess: 'site_assessment' },
  { pattern: /schedule\s+(a\s+)?site\s+assessment/i, targetProcess: 'site_assessment' },
  { pattern: /create\s+(a\s+)?quote\s+for\s+(this|the)/i, targetProcess: 'quoting' },
];

function detectProcessTransition(
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

// =============================================================================
// TESTS
// =============================================================================

describe('Process Orchestration Functions', () => {
  describe('getProcessFromPattern', () => {
    it('should map complete_lead_generation to lead_generation', () => {
      expect(getProcessFromPattern('complete_lead_generation')).toBe('lead_generation');
    });

    it('should map customer_onboarding to lead_generation', () => {
      expect(getProcessFromPattern('customer_onboarding')).toBe('lead_generation');
    });

    it('should map complete_customer_communication to communication', () => {
      expect(getProcessFromPattern('complete_customer_communication')).toBe('communication');
    });

    it('should map complete_site_assessment to site_assessment', () => {
      expect(getProcessFromPattern('complete_site_assessment')).toBe('site_assessment');
    });

    it('should return null for unknown patterns', () => {
      expect(getProcessFromPattern('unknown_pattern')).toBeNull();
      expect(getProcessFromPattern('')).toBeNull();
    });
  });

  describe('getPatternForProcess', () => {
    it('should return correct pattern for lead_generation', () => {
      expect(getPatternForProcess('lead_generation')).toBe('complete_lead_generation');
    });

    it('should return correct pattern for communication', () => {
      expect(getPatternForProcess('communication')).toBe('complete_customer_communication');
    });

    it('should return null for unknown process', () => {
      expect(getPatternForProcess('unknown_process')).toBeNull();
    });
  });

  describe('getProcessLabel', () => {
    it('should return human-readable label for lead_generation', () => {
      expect(getProcessLabel('lead_generation')).toBe('Lead Capture');
    });

    it('should return human-readable label for communication', () => {
      expect(getProcessLabel('communication')).toBe('Customer Communication');
    });

    it('should return process ID as fallback for unknown process', () => {
      expect(getProcessLabel('unknown_process')).toBe('unknown_process');
    });
  });

  describe('getSuggestedNextProcess', () => {
    it('should suggest communication after lead_generation with customer_id', () => {
      const result = getSuggestedNextProcess('lead_generation', {
        customer_id: 'cust-123',
      });
      
      expect(result).not.toBeNull();
      expect(result?.processId).toBe('communication');
      expect(result?.patternId).toBe('complete_customer_communication');
      expect(result?.fromProcess).toBe('lead_generation');
      expect(result?.reason).toContain('contact customer');
    });

    it('should suggest communication when customer_id is in create_customer result', () => {
      const result = getSuggestedNextProcess('lead_generation', {
        create_customer: { customer_id: 'cust-456' },
      });
      
      expect(result).not.toBeNull();
      expect(result?.processId).toBe('communication');
    });

    it('should suggest site_assessment after communication', () => {
      const result = getSuggestedNextProcess('communication', {
        conversation_id: 'conv-123',
      });
      
      expect(result).not.toBeNull();
      expect(result?.processId).toBe('site_assessment');
      expect(result?.patternId).toBe('complete_site_assessment');
    });

    it('should suggest quoting after site_assessment', () => {
      const result = getSuggestedNextProcess('site_assessment', {
        job_id: 'job-123',
      });
      
      expect(result).not.toBeNull();
      expect(result?.processId).toBe('quoting');
    });

    it('should return null for unknown process', () => {
      const result = getSuggestedNextProcess('unknown_process', {});
      expect(result).toBeNull();
    });

    it('should return null when no suggestion logic matches', () => {
      const result = getSuggestedNextProcess('lead_generation', {
        // No customer_id, so no suggestion
      });
      expect(result).toBeNull();
    });

    it('should include context handoff keys in suggestion', () => {
      const result = getSuggestedNextProcess('lead_generation', {
        customer_id: 'cust-789',
        request_id: 'req-123',
        lead_score: 85,
      });
      
      expect(result).not.toBeNull();
      expect(result?.contextToPass).toHaveProperty('customerId', 'cust-789');
      expect(result?.contextToPass).toHaveProperty('customer_id', 'cust-789');
      expect(result?.contextToPass).toHaveProperty('requestId', 'req-123');
      expect(result?.contextToPass).toHaveProperty('leadScore', 85);
    });
  });

  describe('buildProcessContext', () => {
    it('should extract specified handoff keys from flat results', () => {
      const result = {
        customer_id: 'cust-123',
        request_id: 'req-456',
        some_other_key: 'ignored',
      };
      
      const context = buildProcessContext(result, ['customer_id', 'request_id']);
      
      expect(context).toHaveProperty('customer_id', 'cust-123');
      expect(context).toHaveProperty('customerId', 'cust-123');
      expect(context).toHaveProperty('request_id', 'req-456');
      expect(context).not.toHaveProperty('some_other_key');
    });

    it('should extract from nested result structures', () => {
      const result = {
        create_customer: {
          customer_id: 'cust-nested',
        },
        score_lead: {
          lead_score: 90,
        },
      };
      
      const context = buildProcessContext(result, ['customer_id', 'lead_score']);
      
      expect(context).toHaveProperty('customer_id', 'cust-nested');
      expect(context).toHaveProperty('lead_score', 90);
    });

    it('should normalize snake_case to camelCase', () => {
      const result = {
        customer_id: 'cust-123',
        conversation_id: 'conv-456',
      };
      
      const context = buildProcessContext(result, ['customer_id', 'conversation_id']);
      
      expect(context).toHaveProperty('customerId', 'cust-123');
      expect(context).toHaveProperty('conversationId', 'conv-456');
      // Also keeps original
      expect(context).toHaveProperty('customer_id', 'cust-123');
    });

    it('should handle empty handoff keys', () => {
      const result = { customer_id: 'cust-123' };
      const context = buildProcessContext(result, []);
      expect(context).toEqual({});
    });

    it('should handle empty result', () => {
      const context = buildProcessContext({}, ['customer_id']);
      expect(context).toEqual({});
    });
  });

  describe('detectProcessTransition', () => {
    it('should detect "contact this customer" as communication', () => {
      const result = detectProcessTransition('contact this customer', {
        customerId: 'cust-123',
      });
      
      expect(result).not.toBeNull();
      expect(result?.patternId).toBe('complete_customer_communication');
      expect(result?.entities.customerId).toBe('cust-123');
    });

    it('should detect "contact the new lead" as communication', () => {
      const result = detectProcessTransition('contact the new lead', {});
      expect(result).not.toBeNull();
      expect(result?.patternId).toBe('complete_customer_communication');
    });

    it('should detect "reach out to the customer" as communication', () => {
      const result = detectProcessTransition('reach out to the customer now', {});
      expect(result).not.toBeNull();
      expect(result?.patternId).toBe('complete_customer_communication');
    });

    it('should detect "message the customer" as communication', () => {
      const result = detectProcessTransition('message the customer', {});
      expect(result).not.toBeNull();
      expect(result?.patternId).toBe('complete_customer_communication');
    });

    it('should detect "start a conversation with" as communication', () => {
      const result = detectProcessTransition('start a conversation with John', {});
      expect(result).not.toBeNull();
      expect(result?.patternId).toBe('complete_customer_communication');
    });

    it('should detect "schedule assessment for the customer" as site_assessment', () => {
      const result = detectProcessTransition('schedule an assessment for the customer', {
        customerId: 'cust-456',
      });
      
      expect(result).not.toBeNull();
      expect(result?.patternId).toBe('complete_site_assessment');
      expect(result?.entities.customerId).toBe('cust-456');
    });

    it('should detect "book a site visit" as site_assessment', () => {
      const result = detectProcessTransition('book a site visit for tomorrow', {});
      expect(result).not.toBeNull();
      expect(result?.patternId).toBe('complete_site_assessment');
    });

    it('should detect "schedule a site assessment" as site_assessment', () => {
      const result = detectProcessTransition('I want to schedule a site assessment', {});
      expect(result).not.toBeNull();
      expect(result?.patternId).toBe('complete_site_assessment');
    });

    it('should detect "create a quote for the customer" as quoting', () => {
      const result = detectProcessTransition('create a quote for the customer', {});
      expect(result).not.toBeNull();
      expect(result?.patternId).toBe('quote_to_job_complete');
    });

    it('should pass current context to result', () => {
      const result = detectProcessTransition('contact the customer', {
        customerId: 'cust-123',
        conversationId: 'conv-456',
        jobId: 'job-789',
      });
      
      expect(result).not.toBeNull();
      expect(result?.entities).toEqual({
        customerId: 'cust-123',
        conversationId: 'conv-456',
        jobId: 'job-789',
      });
    });

    it('should return null for non-transition messages', () => {
      expect(detectProcessTransition('what is the weather today', {})).toBeNull();
      expect(detectProcessTransition('show me pending jobs', {})).toBeNull();
      expect(detectProcessTransition('hello', {})).toBeNull();
    });

    it('should be case insensitive', () => {
      expect(detectProcessTransition('CONTACT THE CUSTOMER', {})).not.toBeNull();
      expect(detectProcessTransition('Contact The Customer', {})).not.toBeNull();
      expect(detectProcessTransition('CoNtAcT tHe CuStOmEr', {})).not.toBeNull();
    });
  });

  describe('Process Flow Integration', () => {
    it('should chain Lead Gen → Communication → Site Assessment → Quoting', () => {
      // Step 1: Lead Generation completes
      const leadGenResult = {
        customer_id: 'cust-123',
        request_id: 'req-456',
        lead_score: 85,
      };
      
      const afterLeadGen = getSuggestedNextProcess('lead_generation', leadGenResult);
      expect(afterLeadGen?.processId).toBe('communication');
      expect(afterLeadGen?.contextToPass.customerId).toBe('cust-123');
      
      // Step 2: Communication completes
      const commResult = {
        customer_id: 'cust-123',
        conversation_id: 'conv-789',
      };
      
      const afterComm = getSuggestedNextProcess('communication', commResult);
      expect(afterComm?.processId).toBe('site_assessment');
      expect(afterComm?.contextToPass.customerId).toBe('cust-123');
      expect(afterComm?.contextToPass.conversationId).toBe('conv-789');
      
      // Step 3: Site Assessment completes
      const assessResult = {
        customer_id: 'cust-123',
        job_id: 'job-101',
      };
      
      const afterAssess = getSuggestedNextProcess('site_assessment', assessResult);
      expect(afterAssess?.processId).toBe('quoting');
      expect(afterAssess?.contextToPass.customerId).toBe('cust-123');
      expect(afterAssess?.contextToPass.jobId).toBe('job-101');
    });

    it('should detect transition and extract correct pattern', () => {
      // User says they want to contact the customer after lead gen
      const transition = detectProcessTransition('Now contact this customer', {
        customerId: 'cust-123',
      });
      
      expect(transition).not.toBeNull();
      expect(transition?.patternId).toBe('complete_customer_communication');
      
      // The pattern ID should map back to the correct process
      expect(getProcessFromPattern(transition!.patternId)).toBe('communication');
    });
  });
});

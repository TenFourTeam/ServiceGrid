/**
 * Intent Classifier Unit Tests
 * 
 * Tests the intent classification system for the AI agent:
 * - Pattern matching for different intents
 * - Confidence scoring
 * - Clarification detection
 * - Entity extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  classifyIntent, 
  needsClarification, 
  generateClarificationQuestion,
  getClassifier 
} from '@/lib/ai-agent/intent-classifier';

describe('Intent Classifier', () => {
  describe('classifyIntent', () => {
    it('should classify scheduling intents correctly', () => {
      const result = classifyIntent({ 
        message: 'schedule a job for tomorrow',
        currentPage: '/calendar'
      });
      expect(result.domain).toBe('scheduling');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify quote creation intents', () => {
      const result = classifyIntent({ 
        message: 'create a quote for John Smith' 
      });
      expect(result.domain).toBe('quoting');
    });

    it('should classify customer lookup intents', () => {
      const result = classifyIntent({ 
        message: 'find customer John Smith' 
      });
      expect(result.domain).toBe('customers');
    });

    it('should classify job status update intents', () => {
      const result = classifyIntent({ 
        message: 'mark the job as complete' 
      });
      expect(result.domain).toBe('jobs');
    });

    it('should boost confidence for page context match', () => {
      const resultWithContext = classifyIntent({ 
        message: 'schedule this job',
        currentPage: '/calendar'
      });
      
      const resultWithoutContext = classifyIntent({ 
        message: 'schedule this job',
        currentPage: '/settings'
      });
      
      // Calendar page should boost scheduling confidence
      expect(resultWithContext.confidence).toBeGreaterThanOrEqual(resultWithoutContext.confidence);
    });

    it('should extract entities from message', () => {
      const result = classifyIntent({ 
        message: 'create quote for customer John Smith for $500' 
      });
      
      // Should have extracted some entities
      expect(result.entities).toBeDefined();
    });

    it('should handle ambiguous messages', () => {
      const result = classifyIntent({ 
        message: 'help me with this' 
      });
      
      // Should have lower confidence for vague messages
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should identify follow-up intents when context exists', () => {
      const result = classifyIntent({ 
        message: 'yes do it',
        recentActions: ['create_quote']
      });
      
      expect(result.isFollowUp).toBe(true);
    });
  });

  describe('needsClarification', () => {
    it('should return true for low confidence', () => {
      const result = {
        domain: 'general',
        intentId: 'unknown',
        confidence: 0.3,
        entities: {},
        suggestedAction: null,
        isFollowUp: false,
        requiredContext: []
      };
      
      expect(needsClarification(result)).toBe(true);
    });

    it('should return true when multiple intents have similar confidence', () => {
      const result = {
        domain: 'scheduling',
        intentId: 'schedule_job',
        confidence: 0.55,
        entities: {},
        suggestedAction: null,
        isFollowUp: false,
        requiredContext: [],
        alternativeIntents: [
          { intentId: 'reschedule_job', confidence: 0.52 }
        ]
      };
      
      expect(needsClarification(result)).toBe(true);
    });

    it('should return false for high confidence clear intent', () => {
      const result = {
        domain: 'scheduling',
        intentId: 'schedule_job',
        confidence: 0.95,
        entities: { jobId: 'job-123' },
        suggestedAction: 'auto_schedule_job',
        isFollowUp: false,
        requiredContext: []
      };
      
      expect(needsClarification(result)).toBe(false);
    });

    it('should return true for missing required entities', () => {
      const result = {
        domain: 'quoting',
        intentId: 'create_quote',
        confidence: 0.9,
        entities: {},
        suggestedAction: 'create_quote',
        isFollowUp: false,
        requiredContext: ['customerId']
      };
      
      expect(needsClarification(result)).toBe(true);
    });
  });

  describe('generateClarificationQuestion', () => {
    it('should ask about ambiguous intents', () => {
      const result = {
        domain: 'scheduling',
        intentId: 'schedule_job',
        confidence: 0.55,
        entities: {},
        suggestedAction: null,
        isFollowUp: false,
        requiredContext: [],
        alternativeIntents: [
          { intentId: 'reschedule_job', confidence: 0.52 }
        ]
      };
      
      const question = generateClarificationQuestion(result);
      
      expect(question).toBeTruthy();
      expect(question.length).toBeGreaterThan(10);
    });

    it('should ask about missing entities', () => {
      const result = {
        domain: 'quoting',
        intentId: 'create_quote',
        confidence: 0.9,
        entities: {},
        suggestedAction: 'create_quote',
        isFollowUp: false,
        requiredContext: ['customerId']
      };
      
      const question = generateClarificationQuestion(result);
      
      expect(question).toBeTruthy();
      expect(question.toLowerCase()).toContain('customer');
    });

    it('should ask general question for low confidence', () => {
      const result = {
        domain: 'general',
        intentId: 'unknown',
        confidence: 0.2,
        entities: {},
        suggestedAction: null,
        isFollowUp: false,
        requiredContext: []
      };
      
      const question = generateClarificationQuestion(result);
      
      expect(question).toBeTruthy();
      expect(question.toLowerCase()).toMatch(/help|clarify|mean/);
    });
  });

  describe('getClassifier', () => {
    it('should return singleton instance', () => {
      const classifier1 = getClassifier();
      const classifier2 = getClassifier();
      
      expect(classifier1).toBe(classifier2);
    });

    it('should accept custom config', () => {
      const classifier = getClassifier({ 
        minConfidenceThreshold: 0.7 
      });
      
      expect(classifier).toBeDefined();
    });
  });

  describe('Entity Extraction', () => {
    it('should extract customer name from message', () => {
      const result = classifyIntent({ 
        message: 'create a quote for John Smith' 
      });
      
      // Should have extracted customer name
      expect(result.entities?.customerName || result.entities?.name).toBeDefined();
    });

    it('should extract date references', () => {
      const result = classifyIntent({ 
        message: 'schedule job for tomorrow at 2pm' 
      });
      
      expect(result.entities?.date || result.entities?.time).toBeDefined();
    });

    it('should extract monetary amounts', () => {
      const result = classifyIntent({ 
        message: 'create invoice for $500' 
      });
      
      expect(result.entities?.amount).toBeDefined();
    });
  });

  describe('Domain Classification', () => {
    const domainTestCases = [
      { message: 'schedule a job', expectedDomain: 'scheduling' },
      { message: 'create a quote', expectedDomain: 'quoting' },
      { message: 'send an invoice', expectedDomain: 'invoicing' },
      { message: 'find customer', expectedDomain: 'customers' },
      { message: 'check team availability', expectedDomain: 'team' },
      { message: 'update job status', expectedDomain: 'jobs' },
      { message: 'record a payment', expectedDomain: 'payments' },
    ];

    domainTestCases.forEach(({ message, expectedDomain }) => {
      it(`should classify "${message}" as ${expectedDomain} domain`, () => {
        const result = classifyIntent({ message });
        expect(result.domain).toBe(expectedDomain);
      });
    });
  });

  describe('Follow-up Detection', () => {
    it('should detect "yes" as follow-up', () => {
      const result = classifyIntent({ 
        message: 'yes',
        recentActions: ['schedule_job']
      });
      
      expect(result.isFollowUp).toBe(true);
    });

    it('should detect "go ahead" as follow-up', () => {
      const result = classifyIntent({ 
        message: 'go ahead and do it',
        recentActions: ['create_quote']
      });
      
      expect(result.isFollowUp).toBe(true);
    });

    it('should not mark as follow-up without recent actions', () => {
      const result = classifyIntent({ 
        message: 'yes',
        recentActions: []
      });
      
      expect(result.isFollowUp).toBe(false);
    });
  });
});

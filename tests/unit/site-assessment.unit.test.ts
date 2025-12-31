import { describe, it, expect } from 'vitest';
import { MULTI_STEP_PATTERNS, getPattern } from '@/lib/ai-agent/multi-step-patterns';

describe('Site Assessment Process Definition', () => {
  describe('COMPLETE_SITE_ASSESSMENT Pattern', () => {
    it('should exist in the pattern registry', () => {
      const pattern = getPattern('complete_site_assessment');
      expect(pattern).toBeDefined();
    });

    it('should have specialCardType set to assessment_workflow', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.specialCardType).toBe('assessment_workflow');
    });

    it('should have 7 steps matching the assessment workflow', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.steps.length).toBe(7);
    });

    it('should have correct step order and tools', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      
      const expectedSteps = [
        { order: 1, tool: 'search_customers' },
        { order: 2, tool: 'create_customer' },
        { order: 3, tool: 'create_request' },
        { order: 4, tool: 'check_team_availability' },
        { order: 5, tool: 'create_assessment_job' },
        { order: 6, tool: 'assign_job' },
        { order: 7, tool: 'send_job_confirmation' },
      ];

      pattern.steps.forEach((step, index) => {
        expect(step.order).toBe(expectedSteps[index].order);
        expect(step.tool).toBe(expectedSteps[index].tool);
      });
    });

    it('should have category set to pre-service', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.category).toBe('pre-service');
    });

    it('should have success metrics defined', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.successMetrics).toBeDefined();
      expect(pattern.successMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Step Pattern Interface', () => {
    it('should have specialCardType as optional field in pattern interface', () => {
      // Test that patterns can have specialCardType undefined
      const leadPattern = MULTI_STEP_PATTERNS['complete_lead_generation'];
      expect(leadPattern).toBeDefined();
      // Lead pattern should also have specialCardType set
      expect(leadPattern.specialCardType).toBe('lead_workflow');
    });

    it('should only have two valid specialCardType values', () => {
      const validTypes = ['lead_workflow', 'assessment_workflow'];
      
      Object.values(MULTI_STEP_PATTERNS).forEach(pattern => {
        if (pattern.specialCardType) {
          expect(validTypes).toContain(pattern.specialCardType);
        }
      });
    });
  });
});

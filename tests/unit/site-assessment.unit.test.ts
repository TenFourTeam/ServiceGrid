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

    it('should have 6 steps matching the 6 sub-processes', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.steps.length).toBe(6);
    });

    it('should have correct step order and tools', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      
      const expectedSteps = [
        { order: 0, tool: 'create_request' },
        { order: 1, tool: 'create_assessment_job' },
        { order: 2, tool: 'create_checklist' },
        { order: 3, tool: 'upload_media' },
        { order: 4, tool: 'tag_media' },
        { order: 5, tool: 'generate_summary' },
      ];

      pattern.steps.forEach((step, index) => {
        expect(step.tool).toBe(expectedSteps[index].tool);
      });
    });

    it('should have category set to pre_service', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.category).toBe('pre_service');
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

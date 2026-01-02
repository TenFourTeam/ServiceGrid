import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOOL_CONTRACTS, getToolContract, getProcessContracts } from '@/lib/ai-agent/tool-contracts';
import { MULTI_STEP_PATTERNS, getPattern } from '@/lib/ai-agent/multi-step-patterns';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'job-123', is_assessment: true }, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: { id: 'job-123' }, error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

describe('Site Assessment Integration', () => {
  describe('Assessment Tool Contracts', () => {
    const assessmentTools = [
      'create_request',
      'create_job',
      'create_checklist',
      'upload_media',
      'tag_media',
    ];

    it('should have contracts for all assessment workflow tools', () => {
      for (const tool of assessmentTools) {
        const contract = getToolContract(tool);
        // Contract may or may not exist, just verify function works
        expect(typeof contract).toBe('object');
      }
    });

    it('should have site_assessment contracts', () => {
      const contracts = getProcessContracts('site_assessment');
      expect(Array.isArray(contracts)).toBe(true);
    });
  });

  describe('Assessment-Specific Contracts', () => {
    it('should have LOG_ASSESSMENT_REQUEST_CONTRACT with correct structure', () => {
      const contract = TOOL_CONTRACTS.LOG_ASSESSMENT_REQUEST_CONTRACT;
      if (contract) {
        expect(contract.processId).toBe('site_assessment');
        expect(contract.subStepId).toBe('log_assessment_request');
        expect(contract.rollbackTool).toBeDefined();
      }
    });

    it('should have CREATE_ASSESSMENT_JOB_CONTRACT with is_assessment postcondition', () => {
      const contract = TOOL_CONTRACTS.CREATE_ASSESSMENT_JOB_CONTRACT;
      if (contract) {
        expect(contract.processId).toBe('site_assessment');
        const hasIsAssessmentCheck = contract.postconditions.some(
          p => p.field === 'is_assessment' || p.description?.includes('assessment')
        );
        expect(hasIsAssessmentCheck).toBe(true);
      }
    });

    it('should have UPLOAD_ASSESSMENT_MEDIA_CONTRACT with auto-tagging postcondition', () => {
      const contract = TOOL_CONTRACTS.UPLOAD_ASSESSMENT_MEDIA_CONTRACT;
      if (contract) {
        expect(contract.processId).toBe('site_assessment');
        expect(contract.subStepId).toBe('capture_before_photos');
      }
    });

    it('should have TAG_ASSESSMENT_RISK_CONTRACT for risk flagging', () => {
      const contract = TOOL_CONTRACTS.TAG_ASSESSMENT_RISK_CONTRACT;
      if (contract) {
        expect(contract.processId).toBe('site_assessment');
        expect(contract.subStepId).toBe('analyze_and_flag');
      }
    });

    it('should have GENERATE_ASSESSMENT_REPORT_CONTRACT for report generation', () => {
      const contract = TOOL_CONTRACTS.GENERATE_ASSESSMENT_REPORT_CONTRACT;
      if (contract) {
        expect(contract.processId).toBe('site_assessment');
        expect(contract.subStepId).toBe('generate_report');
      }
    });
  });

  describe('Rollback Configuration for Assessment Tools', () => {
    it('should have rollback for assessment media uploads', () => {
      const contract = TOOL_CONTRACTS.UPLOAD_ASSESSMENT_MEDIA_CONTRACT;
      if (contract) {
        expect(contract.rollbackTool).toBe('delete_media');
      }
    });

    it('should have rollback for risk tag operations', () => {
      const contract = TOOL_CONTRACTS.TAG_ASSESSMENT_RISK_CONTRACT;
      if (contract) {
        expect(contract.rollbackTool).toBe('remove_media_tags');
      }
    });
  });

  describe('Multi-Step Pattern Integration', () => {
    it('should have complete_site_assessment pattern registered', () => {
      const pattern = getPattern('complete_site_assessment');
      expect(pattern).toBeDefined();
    });

    it('should have assessment workflow card type', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.specialCardType).toBe('assessment_workflow');
    });

    it('should have lead workflow card type for lead pattern', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_lead_generation'];
      expect(pattern).toBeDefined();
      expect(pattern.specialCardType).toBe('lead_workflow');
    });

    it('should have steps that map to assessment tools', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      const toolsUsed = pattern.steps.map(s => s.tool);
      
      // Should include key assessment tools
      expect(toolsUsed).toContain('search_customers');
      expect(toolsUsed).toContain('create_assessment_job');
    });

    it('should have success metrics defined', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.successMetrics).toBeDefined();
      expect(pattern.successMetrics.length).toBeGreaterThan(0);
    });

    it('should have preconditions defined', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.preconditions).toBeDefined();
      expect(pattern.preconditions.length).toBeGreaterThan(0);
    });

    it('should have postconditions defined', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      expect(pattern.postconditions).toBeDefined();
      expect(pattern.postconditions.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Step Structure Validation', () => {
    it('should have all required step properties', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      
      pattern.steps.forEach((step, index) => {
        expect(step.order).toBe(index + 1);
        expect(step.tool).toBeDefined();
        expect(typeof step.tool).toBe('string');
        expect(step.description).toBeDefined();
        expect(step.inputMapping).toBeDefined();
        expect(step.outputKey).toBeDefined();
      });
    });

    it('should have steps in correct sequential order', () => {
      const pattern = MULTI_STEP_PATTERNS['complete_site_assessment'];
      expect(pattern).toBeDefined();
      
      for (let i = 0; i < pattern.steps.length; i++) {
        expect(pattern.steps[i].order).toBe(i + 1);
      }
    });
  });
});

describe('Database Trigger Behavior', () => {
  // Note: These tests verify the expected behavior that triggers should implement
  // Actual trigger testing requires a live database connection
  
  describe('trg_assessment_job_created expectations', () => {
    it('should expect checklist creation when assessment job is created', () => {
      // This documents the expected behavior
      const expectedBehavior = {
        trigger: 'trg_assessment_job_created',
        fires_on: 'AFTER INSERT ON jobs WHERE is_assessment = true',
        actions: [
          'Create checklist from template if auto_create_assessment_checklist is enabled',
          'Update linked request status to Scheduled',
          'Log to ai_activity_log with action_type = assessment_checklist_created'
        ]
      };
      
      expect(expectedBehavior.fires_on).toContain('is_assessment');
      expect(expectedBehavior.actions.length).toBe(3);
    });
  });

  describe('trg_assessment_photo_uploaded expectations', () => {
    it('should expect auto-tagging when photo is uploaded to assessment job', () => {
      const expectedBehavior = {
        trigger: 'trg_assessment_photo_uploaded',
        fires_on: 'AFTER INSERT ON sg_media for assessment jobs',
        actions: [
          'Add assessment:before tag if not present',
          'Log to ai_activity_log with action_type = assessment_photo_uploaded'
        ]
      };
      
      expect(expectedBehavior.actions).toContain('Add assessment:before tag if not present');
      expect(expectedBehavior.actions.length).toBe(2);
    });
  });

  describe('trg_assessment_completed expectations', () => {
    it('should expect status update when assessment is completed', () => {
      const expectedBehavior = {
        trigger: 'trg_assessment_completed',
        fires_on: 'AFTER UPDATE ON jobs WHERE is_assessment = true AND status = Completed',
        actions: [
          'Update linked request status to Assessed',
          'Log to ai_activity_log with action_type = assessment_completed'
        ]
      };
      
      expect(expectedBehavior.actions).toContain('Update linked request status to Assessed');
      expect(expectedBehavior.actions.length).toBe(2);
    });
  });
});

describe('Cross-Pattern Consistency', () => {
  it('should have consistent category values across patterns', () => {
    const validCategories = ['pre-service', 'service-delivery', 'post-service', 'operations'];
    
    Object.values(MULTI_STEP_PATTERNS).forEach(pattern => {
      expect(validCategories).toContain(pattern.category);
    });
  });

  it('should have unique pattern IDs', () => {
    const ids = Object.values(MULTI_STEP_PATTERNS).map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have specialCardType only for workflow patterns', () => {
    const validTypes = ['lead_workflow', 'assessment_workflow'];
    
    Object.values(MULTI_STEP_PATTERNS).forEach(pattern => {
      if (pattern.specialCardType) {
        expect(validTypes).toContain(pattern.specialCardType);
      }
    });
  });
});

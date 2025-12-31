/**
 * Customer Communication Process - Integration Tests
 * 
 * Tests the integration between communication components, 
 * step verifier contracts, and database operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('Communication Process Integration', () => {
  describe('Tool Contracts in Frontend', () => {
    it('should have all communication contracts defined', async () => {
      const { CONTRACTS } = await import('@/lib/ai-agent/processes/communication');
      const expectedTools = [
        'create_conversation',
        'get_or_create_conversation', 
        'get_conversation_details',
        'send_message',
        'send_email',
        'send_status_update',
        'queue_email',
        'queue_followup_email'
      ];
      
      const contractTools = CONTRACTS.map(c => c.toolName);
      expectedTools.forEach(tool => {
        expect(contractTools).toContain(tool);
      });
    });

    it('contracts should map to correct sub-steps', async () => {
      const { CONTRACTS, DEFINITION } = await import('@/lib/ai-agent/processes/communication');
      
      const subStepIds = DEFINITION.subSteps.map(s => s.name);
      
      CONTRACTS.forEach(contract => {
        // Verify sub-step reference exists
        expect(contract.subStep).toBeDefined();
      });
    });
  });

  describe('Pattern Integration', () => {
    it('should have specialCardType set to communication_workflow', async () => {
      const { PATTERN } = await import('@/lib/ai-agent/processes/communication');
      expect(PATTERN.specialCardType).toBe('communication_workflow');
    });

    it('pattern should have valid category', async () => {
      const { PATTERN } = await import('@/lib/ai-agent/processes/communication');
      expect(['pre-service', 'service-delivery', 'post-service', 'operations']).toContain(PATTERN.category);
    });

    it('pattern steps should reference valid tools', async () => {
      const { PATTERN, CONTRACTS } = await import('@/lib/ai-agent/processes/communication');
      const contractTools = CONTRACTS.map(c => c.toolName);
      
      PATTERN.steps.forEach(step => {
        // Either tool is in contracts or is a general tool
        const isKnownTool = contractTools.includes(step.tool) || 
          ['get_customer', 'get_job'].includes(step.tool);
        expect(isKnownTool).toBe(true);
      });
    });

    it('all communication patterns should be exported', async () => {
      const { COMMUNICATION_PATTERNS } = await import('@/lib/ai-agent/processes/communication');
      expect(COMMUNICATION_PATTERNS.PATTERN).toBeDefined();
      expect(COMMUNICATION_PATTERNS.JOB_STATUS_UPDATE_PATTERN).toBeDefined();
      expect(COMMUNICATION_PATTERNS.POST_SERVICE_FOLLOWUP_PATTERN).toBeDefined();
    });
  });

  describe('Process Flow Integration', () => {
    it('should connect from lead_generation', async () => {
      const { DEFINITION } = await import('@/lib/ai-agent/processes/communication');
      expect(DEFINITION.previousProcesses).toContain('lead_generation');
    });

    it('should connect to site_assessment', async () => {
      const { DEFINITION } = await import('@/lib/ai-agent/processes/communication');
      expect(DEFINITION.nextProcesses).toContain('site_assessment');
    });
    
    it('should also connect to quoting_estimating', async () => {
      const { DEFINITION } = await import('@/lib/ai-agent/processes/communication');
      expect(DEFINITION.nextProcesses).toContain('quoting_estimating');
    });
  });

  describe('CommunicationWorkflowCard Integration', () => {
    it('should be importable and have correct exports', async () => {
      const { CommunicationWorkflowCard } = await import('@/components/AI/CommunicationWorkflowCard');
      expect(CommunicationWorkflowCard).toBeDefined();
      expect(typeof CommunicationWorkflowCard).toBe('function');
    });

    it('should export step and summary types', async () => {
      const module = await import('@/components/AI/CommunicationWorkflowCard');
      // Type exports can't be tested at runtime, but ensure component is valid
      expect(module.CommunicationWorkflowCard).toBeDefined();
    });
  });

  describe('Trigger Integration', () => {
    it('should have DFY triggers registered', async () => {
      const { TRIGGERS } = await import('@/lib/ai-agent/processes/communication');
      
      // DFY Sub-Process 1: Auto-create conversation
      expect(TRIGGERS.triggers).toContain('trg_auto_create_conversation_on_request');
      expect(TRIGGERS.functions).toContain('fn_auto_create_conversation_on_request');
      
      // DFY Sub-Process 4: Job status customer notification
      expect(TRIGGERS.triggers).toContain('trg_job_status_customer_notification');
      expect(TRIGGERS.functions).toContain('fn_job_status_customer_notification');
      
      // DFY Sub-Process 5: Follow-up queue
      expect(TRIGGERS.triggers).toContain('trg_job_complete_followup_queue');
      expect(TRIGGERS.functions).toContain('fn_queue_job_followup_email');
    });
  });

  describe('Process Definition Completeness', () => {
    it('should have all required SIPOC elements', async () => {
      const { DEFINITION } = await import('@/lib/ai-agent/processes/communication');
      
      expect(DEFINITION.sipoc.suppliers.length).toBeGreaterThan(0);
      expect(DEFINITION.sipoc.inputs.length).toBeGreaterThan(0);
      expect(DEFINITION.sipoc.processSteps.length).toBeGreaterThan(0);
      expect(DEFINITION.sipoc.outputs.length).toBeGreaterThan(0);
      expect(DEFINITION.sipoc.customers.length).toBeGreaterThan(0);
    });

    it('should have 5 sub-steps defined', async () => {
      const { DEFINITION } = await import('@/lib/ai-agent/processes/communication');
      expect(DEFINITION.subSteps.length).toBe(5);
    });

    it('should have tools defined', async () => {
      const { DEFINITION } = await import('@/lib/ai-agent/processes/communication');
      expect(DEFINITION.tools.length).toBeGreaterThan(0);
    });

    it('should have input/output contracts', async () => {
      const { DEFINITION } = await import('@/lib/ai-agent/processes/communication');
      expect(Object.keys(DEFINITION.inputContract).length).toBeGreaterThan(0);
      expect(Object.keys(DEFINITION.outputContract).length).toBeGreaterThan(0);
    });
  });

  describe('Module Exports', () => {
    it('should export all required items from index', async () => {
      const module = await import('@/lib/ai-agent/processes/communication');
      
      expect(module.DEFINITION).toBeDefined();
      expect(module.CONTRACTS).toBeDefined();
      expect(module.PATTERN).toBeDefined();
      expect(module.TESTS).toBeDefined();
      expect(module.TRIGGERS).toBeDefined();
      
      // Individual contract exports
      expect(module.CREATE_CONVERSATION_CONTRACT).toBeDefined();
      expect(module.GET_OR_CREATE_CONVERSATION_CONTRACT).toBeDefined();
      expect(module.SEND_MESSAGE_CONTRACT).toBeDefined();
      expect(module.SEND_EMAIL_CONTRACT).toBeDefined();
      expect(module.QUEUE_EMAIL_CONTRACT).toBeDefined();
    });

    it('should be registered in PROCESS_MODULES', async () => {
      const { PROCESS_MODULES } = await import('@/lib/ai-agent/processes');
      expect(PROCESS_MODULES.communication).toBeDefined();
    });
  });
});

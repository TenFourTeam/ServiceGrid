import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOOL_CONTRACTS, getToolContract, getProcessContracts } from '@/lib/ai-agent/tool-contracts';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'cust-123' }, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: { id: 'cust-123' }, error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  },
}));

describe('Verification Loop', () => {
  const mockContext = {
    businessId: 'biz-123',
    userId: 'user-123',
    args: { name: 'Test Customer', email: 'test@example.com' },
    entities: {},
    previousResults: {},
  };

  describe('Tool Contract Registry', () => {
    it('should have contracts for all lead generation tools', () => {
      const leadGenTools = ['create_customer', 'update_customer', 'create_request', 'score_lead'];
      
      for (const tool of leadGenTools) {
        const contract = getToolContract(tool);
        expect(contract).not.toBeNull();
        expect(contract?.processId).toBe('lead_generation');
      }
    });

    it('should return null for unknown tools', () => {
      const contract = getToolContract('nonexistent_tool');
      expect(contract).toBeNull();
    });

    it('should get all contracts for a process', () => {
      const contracts = getProcessContracts('lead_generation');
      expect(contracts.length).toBeGreaterThan(0);
      expect(contracts.every(c => c.processId === 'lead_generation')).toBe(true);
    });
  });

  describe('Contract Structure Validation', () => {
    it('should have valid precondition structure', () => {
      const contract = TOOL_CONTRACTS.create_customer;
      
      for (const precondition of contract.preconditions) {
        expect(precondition.id).toBeDefined();
        expect(precondition.description).toBeDefined();
        expect(precondition.type).toBeDefined();
      }
    });

    it('should have valid postcondition structure', () => {
      const contract = TOOL_CONTRACTS.create_customer;
      
      for (const postcondition of contract.postconditions) {
        expect(postcondition.id).toBeDefined();
        expect(postcondition.description).toBeDefined();
        expect(postcondition.type).toBeDefined();
      }
    });

    it('should have valid db assertion structure', () => {
      const contract = TOOL_CONTRACTS.create_customer;
      
      for (const assertion of contract.dbAssertions) {
        expect(assertion.id).toBeDefined();
        expect(assertion.table).toBeDefined();
        expect(assertion.query).toBeDefined();
        expect(assertion.expect).toBeDefined();
      }
    });
  });

  describe('Rollback Configuration', () => {
    it('should have rollback configured for create_customer', () => {
      const contract = TOOL_CONTRACTS.create_customer;
      expect(contract.rollbackTool).toBe('delete_customer');
      expect(contract.rollbackArgs).toBeDefined();
    });

    it('should have rollback configured for create_job', () => {
      const contract = TOOL_CONTRACTS.create_job;
      expect(contract.rollbackTool).toBe('delete_job');
    });

    it('should have rollback configured for create_quote', () => {
      const contract = TOOL_CONTRACTS.create_quote;
      expect(contract.rollbackTool).toBe('delete_quote');
    });

    it('should have rollback configured for assign_job', () => {
      const contract = TOOL_CONTRACTS.assign_job;
      expect(contract.rollbackTool).toBe('unassign_job');
    });
  });

  describe('Process Contracts Coverage', () => {
    const processIds = [
      'lead_generation',
      'quoting_estimating',
      'scheduling',
      'dispatching',
      'invoicing',
      'payment_collection',
    ];

    for (const processId of processIds) {
      it(`should have contracts for ${processId} process`, () => {
        const contracts = getProcessContracts(processId);
        expect(contracts.length).toBeGreaterThan(0);
      });
    }
  });
});

describe('Metrics Collection', () => {
  it('should have verification metrics interface defined', async () => {
    // Dynamically import to test exports
    const { getVerificationMetrics, recordVerificationMetrics } = await import('@/lib/ai-agent/step-verifier');
    
    expect(typeof getVerificationMetrics).toBe('function');
    expect(typeof recordVerificationMetrics).toBe('function');
  });

  it('should return empty array for unknown tool metrics', async () => {
    const { getVerificationMetrics } = await import('@/lib/ai-agent/step-verifier');
    
    const metrics = getVerificationMetrics('unknown_tool_xyz');
    expect(metrics).toEqual([]);
  });

  it('should return all metrics when no tool specified', async () => {
    const { getVerificationMetrics } = await import('@/lib/ai-agent/step-verifier');
    
    const metrics = getVerificationMetrics();
    expect(Array.isArray(metrics)).toBe(true);
  });
});

describe('Assertion Types', () => {
  it('should support entity_exists assertions', () => {
    const contract = TOOL_CONTRACTS.create_customer;
    const entityExistsAssertions = contract.postconditions.filter(
      a => a.type === 'entity_exists'
    );
    expect(entityExistsAssertions.length).toBeGreaterThan(0);
  });

  it('should support field_equals assertions', () => {
    const contract = TOOL_CONTRACTS.create_quote;
    const fieldEqualsAssertions = contract.postconditions.filter(
      a => a.type === 'field_equals'
    );
    expect(fieldEqualsAssertions.length).toBeGreaterThan(0);
  });

  it('should support field_not_null assertions', () => {
    const contract = TOOL_CONTRACTS.update_quote;
    const fieldNotNullAssertions = contract.preconditions.filter(
      a => a.type === 'field_not_null'
    );
    expect(fieldNotNullAssertions.length).toBeGreaterThan(0);
  });
});

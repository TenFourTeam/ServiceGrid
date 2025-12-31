import { describe, it, expect } from 'vitest';
import { MULTI_STEP_PATTERNS, validatePatternInput, resolveTemplateValue } from '@/lib/ai-agent/multi-step-patterns';
import { TOOL_CONTRACTS } from '@/lib/ai-agent/tool-contracts';

describe('Lead Generation Process', () => {
  describe('Multi-Step Pattern', () => {
    const pattern = MULTI_STEP_PATTERNS.complete_lead_generation;

    it('should have all 7 steps defined', () => {
      expect(pattern.steps).toHaveLength(7);
    });

    it('should have correct step order', () => {
      const orders = pattern.steps.map(s => s.order);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('should have expected tools in order', () => {
      const tools = pattern.steps.map(s => s.tool);
      expect(tools).toEqual([
        'search_customers',
        'create_customer',
        'score_lead',
        'create_request',
        'check_team_availability',
        'auto_assign_lead',
        'send_email',
      ]);
    });

    it('should have preconditions defined', () => {
      expect(pattern.preconditions.length).toBeGreaterThan(0);
      expect(pattern.preconditions).toContain('Input must contain at least name and (email or phone)');
    });

    it('should have postconditions defined', () => {
      expect(pattern.postconditions.length).toBeGreaterThan(0);
      expect(pattern.postconditions).toContain('Customer record exists with calculated lead_score');
    });

    it('should have success metrics defined', () => {
      expect(pattern.successMetrics).toContain('customer_created');
      expect(pattern.successMetrics).toContain('lead_scored');
      expect(pattern.successMetrics).toContain('lead_assigned');
    });

    it('should mark optional steps correctly', () => {
      const optionalSteps = pattern.steps.filter(s => s.optional);
      expect(optionalSteps.length).toBeGreaterThan(0);
      expect(optionalSteps.some(s => s.tool === 'create_request')).toBe(true);
      expect(optionalSteps.some(s => s.tool === 'send_email')).toBe(true);
    });

    it('should have skipIf conditions where appropriate', () => {
      const createCustomerStep = pattern.steps.find(s => s.tool === 'create_customer');
      expect(createCustomerStep?.skipIf).toBe('{{existing_customer.found}}');
    });
  });

  describe('Input Validation', () => {
    const pattern = MULTI_STEP_PATTERNS.complete_lead_generation;

    it('should validate complete input', () => {
      const result = validatePatternInput(pattern, {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
      });
      // First step is search_customers which uses email and phone
      expect(result.missing.length).toBeLessThanOrEqual(1);
    });

    it('should identify missing required fields', () => {
      const result = validatePatternInput(pattern, {});
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe('Template Resolution', () => {
    it('should resolve input references', () => {
      const result = resolveTemplateValue('{{input.name}}', {
        input: { name: 'Test Customer', email: 'test@example.com' },
        results: {},
        context: {},
      });
      expect(result).toBe('Test Customer');
    });

    it('should resolve result references', () => {
      const result = resolveTemplateValue('{{new_customer.id}}', {
        input: {},
        results: { new_customer: { id: 'cust-123', name: 'Test' } },
        context: {},
      });
      expect(result).toBe('cust-123');
    });

    it('should resolve context references', () => {
      const result = resolveTemplateValue('{{context.business_id}}', {
        input: {},
        results: {},
        context: { business_id: 'biz-123' },
      });
      expect(result).toBe('biz-123');
    });

    it('should return undefined for missing references', () => {
      const result = resolveTemplateValue('{{missing.field}}', {
        input: {},
        results: {},
        context: {},
      });
      expect(result).toBeUndefined();
    });
  });
});

describe('Tool Contracts', () => {
  describe('create_customer contract', () => {
    const contract = TOOL_CONTRACTS.create_customer;

    it('should exist in registry', () => {
      expect(contract).toBeDefined();
    });

    it('should have correct process ID', () => {
      expect(contract.processId).toBe('lead_generation');
    });

    it('should have preconditions', () => {
      expect(contract.preconditions.length).toBeGreaterThan(0);
      expect(contract.preconditions.some(p => p.id === 'email_provided')).toBe(true);
      expect(contract.preconditions.some(p => p.id === 'name_provided')).toBe(true);
    });

    it('should have postconditions', () => {
      expect(contract.postconditions.length).toBeGreaterThan(0);
      expect(contract.postconditions.some(p => p.id === 'customer_created')).toBe(true);
    });

    it('should have rollback defined', () => {
      expect(contract.rollbackTool).toBe('delete_customer');
      expect(contract.rollbackArgs).toEqual({ customer_id: 'result.id' });
    });

    it('should have database assertions', () => {
      expect(contract.dbAssertions.length).toBeGreaterThan(0);
      expect(contract.dbAssertions[0].table).toBe('customers');
    });
  });

  describe('create_request contract', () => {
    const contract = TOOL_CONTRACTS.create_request;

    it('should exist in registry', () => {
      expect(contract).toBeDefined();
    });

    it('should have correct process ID', () => {
      expect(contract.processId).toBe('lead_generation');
    });

    it('should have customer existence precondition', () => {
      expect(contract.preconditions.some(p => p.id === 'customer_exists')).toBe(true);
    });

    it('should have database assertion for request', () => {
      expect(contract.dbAssertions.some(a => a.table === 'requests')).toBe(true);
    });
  });

  describe('score_lead contract', () => {
    const contract = TOOL_CONTRACTS.score_lead;

    it('should exist in registry', () => {
      expect(contract).toBeDefined();
    });

    it('should belong to lead_generation process', () => {
      expect(contract.processId).toBe('lead_generation');
    });
  });
});

describe('Quote to Job Pattern', () => {
  const pattern = MULTI_STEP_PATTERNS.quote_to_job;

  it('should have all 5 steps defined', () => {
    expect(pattern.steps).toHaveLength(5);
  });

  it('should start with fetching the quote', () => {
    expect(pattern.steps[0].tool).toBe('get_quote');
  });

  it('should create job as second step', () => {
    expect(pattern.steps[1].tool).toBe('create_job');
  });

  it('should have proper preconditions', () => {
    expect(pattern.preconditions).toContain('Quote must exist and be in Approved status');
  });
});

describe('Job to Invoice Pattern', () => {
  const pattern = MULTI_STEP_PATTERNS.job_to_invoice;

  it('should have all 4 steps defined', () => {
    expect(pattern.steps).toHaveLength(4);
  });

  it('should start with completing the job', () => {
    expect(pattern.steps[0].tool).toBe('complete_job');
  });

  it('should be categorized as post-service', () => {
    expect(pattern.category).toBe('post-service');
  });
});

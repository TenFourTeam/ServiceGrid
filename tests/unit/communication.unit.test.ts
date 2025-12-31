/**
 * Customer Communication Process - Unit Tests
 * 
 * Tests for communication tool contracts, patterns, and definition.
 */

import { describe, it, expect } from 'vitest';
import { DEFINITION } from '@/lib/ai-agent/processes/communication/definition';
import { CONTRACTS } from '@/lib/ai-agent/processes/communication/contracts';
import { PATTERN, JOB_STATUS_UPDATE_PATTERN, POST_SERVICE_FOLLOWUP_PATTERN } from '@/lib/ai-agent/processes/communication/pattern';
import { TRIGGERS } from '@/lib/ai-agent/processes/communication/triggers';
import { PROCESS_IDS } from '@/lib/ai-agent/process-ids';

describe('Communication Process Definition', () => {
  it('should have correct process ID', () => {
    expect(DEFINITION.id).toBe(PROCESS_IDS.COMMUNICATION);
  });

  it('should be in pre_service phase', () => {
    expect(DEFINITION.phase).toBe('pre_service');
  });

  it('should have 5 sub-steps', () => {
    expect(DEFINITION.subSteps).toHaveLength(5);
  });

  it('should have sub-steps in correct order', () => {
    const subStepIds = DEFINITION.subSteps.map(s => s.id);
    expect(subStepIds).toEqual([
      'comm_receive_inquiry',
      'comm_access_data',
      'comm_send_details',
      'comm_realtime_updates',
      'comm_followup'
    ]);
  });

  it('should have correct current and target states', () => {
    expect(DEFINITION.currentState).toBe('DWY');
    expect(DEFINITION.targetState).toBe('DFY');
  });

  it('should have SIPOC with all required fields', () => {
    expect(DEFINITION.sipoc.suppliers).toHaveLength(5);
    expect(DEFINITION.sipoc.inputs).toHaveLength(5);
    expect(DEFINITION.sipoc.processSteps).toHaveLength(5);
    expect(DEFINITION.sipoc.outputs).toHaveLength(5);
    expect(DEFINITION.sipoc.customers).toHaveLength(3);
  });

  it('each sub-step should have complete SIPOC', () => {
    DEFINITION.subSteps.forEach(subStep => {
      expect(subStep.sipoc.supplier).toBeTruthy();
      expect(subStep.sipoc.input).toBeTruthy();
      expect(subStep.sipoc.process).toBeTruthy();
      expect(subStep.sipoc.output).toBeTruthy();
      expect(subStep.sipoc.customer).toBeTruthy();
    });
  });

  it('each sub-step should have tools defined', () => {
    DEFINITION.subSteps.forEach(subStep => {
      expect(subStep.tools.length).toBeGreaterThan(0);
    });
  });

  it('each sub-step should have automation capabilities', () => {
    DEFINITION.subSteps.forEach(subStep => {
      expect(subStep.automationCapabilities.length).toBeGreaterThan(0);
    });
  });
});

describe('Communication Tool Contracts', () => {
  it('should have 8 contracts defined', () => {
    expect(CONTRACTS).toHaveLength(8);
  });

  it('all contracts should have processId set to COMMUNICATION', () => {
    CONTRACTS.forEach(contract => {
      expect(contract.processId).toBe(PROCESS_IDS.COMMUNICATION);
    });
  });

  it('all contracts should have preconditions', () => {
    CONTRACTS.forEach(contract => {
      expect(contract.preconditions.length).toBeGreaterThan(0);
    });
  });

  it('all contracts should have postconditions', () => {
    CONTRACTS.forEach(contract => {
      expect(contract.postconditions.length).toBeGreaterThan(0);
    });
  });

  it('create_conversation contract should have rollback tool', () => {
    const createConvContract = CONTRACTS.find(c => c.toolName === 'create_conversation');
    expect(createConvContract?.rollbackTool).toBe('delete_conversation');
  });

  it('queue_email contract should have rollback tool', () => {
    const queueEmailContract = CONTRACTS.find(c => c.toolName === 'queue_email');
    expect(queueEmailContract?.rollbackTool).toBe('cancel_queued_email');
  });

  it('send_message contract should NOT have rollback tool (messages cannot be unsent)', () => {
    const sendMsgContract = CONTRACTS.find(c => c.toolName === 'send_message');
    expect(sendMsgContract?.rollbackTool).toBeUndefined();
  });

  it('contracts should map to correct sub-steps', () => {
    const contractSubStepMap: Record<string, string> = {
      'create_conversation': 'comm_receive_inquiry',
      'get_or_create_conversation': 'comm_receive_inquiry',
      'get_conversation_details': 'comm_access_data',
      'send_message': 'comm_send_details',
      'send_email': 'comm_send_details',
      'send_status_update': 'comm_realtime_updates',
      'queue_email': 'comm_followup',
      'queue_followup_email': 'comm_followup'
    };

    CONTRACTS.forEach(contract => {
      expect(contract.subStepId).toBe(contractSubStepMap[contract.toolName]);
    });
  });
});

describe('Communication Multi-Step Patterns', () => {
  it('PATTERN should have 4 steps', () => {
    expect(PATTERN.steps).toHaveLength(4);
  });

  it('PATTERN should be pre-service category', () => {
    expect(PATTERN.category).toBe('pre-service');
  });

  it('JOB_STATUS_UPDATE_PATTERN should be service-delivery category', () => {
    expect(JOB_STATUS_UPDATE_PATTERN.category).toBe('service-delivery');
  });

  it('POST_SERVICE_FOLLOWUP_PATTERN should be post-service category', () => {
    expect(POST_SERVICE_FOLLOWUP_PATTERN.category).toBe('post-service');
  });

  it('all patterns should have preconditions', () => {
    expect(PATTERN.preconditions.length).toBeGreaterThan(0);
    expect(JOB_STATUS_UPDATE_PATTERN.preconditions.length).toBeGreaterThan(0);
    expect(POST_SERVICE_FOLLOWUP_PATTERN.preconditions.length).toBeGreaterThan(0);
  });

  it('all patterns should have postconditions', () => {
    expect(PATTERN.postconditions.length).toBeGreaterThan(0);
    expect(JOB_STATUS_UPDATE_PATTERN.postconditions.length).toBeGreaterThan(0);
    expect(POST_SERVICE_FOLLOWUP_PATTERN.postconditions.length).toBeGreaterThan(0);
  });

  it('all patterns should have success metrics', () => {
    expect(PATTERN.successMetrics.length).toBeGreaterThan(0);
    expect(JOB_STATUS_UPDATE_PATTERN.successMetrics.length).toBeGreaterThan(0);
    expect(POST_SERVICE_FOLLOWUP_PATTERN.successMetrics.length).toBeGreaterThan(0);
  });

  it('pattern steps should have correct order', () => {
    PATTERN.steps.forEach((step, idx) => {
      expect(step.order).toBe(idx + 1);
    });
  });
});

describe('Communication Triggers Registry', () => {
  it('should have 6 triggers defined', () => {
    expect(TRIGGERS.triggers).toHaveLength(6);
  });

  it('should have 4 functions defined', () => {
    expect(TRIGGERS.functions).toHaveLength(4);
  });

  it('should include DFY automation triggers', () => {
    expect(TRIGGERS.triggers).toContain('trg_auto_create_conversation_on_request');
    expect(TRIGGERS.triggers).toContain('trg_job_status_customer_notification');
    expect(TRIGGERS.triggers).toContain('trg_job_complete_followup_queue');
  });

  it('should include corresponding trigger functions', () => {
    expect(TRIGGERS.functions).toContain('fn_auto_create_conversation_on_request');
    expect(TRIGGERS.functions).toContain('fn_job_status_customer_notification');
    expect(TRIGGERS.functions).toContain('fn_queue_job_followup_email');
  });
});

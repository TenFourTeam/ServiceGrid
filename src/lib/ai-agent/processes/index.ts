/**
 * Process Module Aggregator
 * 
 * Automatically builds registries from individual process modules.
 * Add new processes here after creating their module folder.
 */

import { PROCESS_IDS, ALL_PROCESS_IDS, type ProcessId } from '../process-ids';
import type { 
  ProcessModule, 
  ProcessDefinition, 
  ProcessTestFiles, 
  ProcessTriggers,
  MultiStepPattern 
} from './types';
import type { ToolContract } from '../tool-contracts';

// Import implemented process modules
import * as leadGeneration from './lead-generation';
import * as siteAssessment from './site-assessment';

// ============================================================================
// STUB GENERATOR FOR UNIMPLEMENTED PROCESSES
// ============================================================================

function createStubModule(id: ProcessId, name: string, phase: 'pre_service' | 'service_delivery' | 'post_service' | 'operations', position: number): Partial<ProcessModule> {
  return {
    DEFINITION: {
      id,
      name,
      description: `${name} process (not yet implemented)`,
      phase,
      position,
      order: position,
      depth: 0,
      currentState: 'DIY',
      targetState: 'DFY',
      sipoc: { suppliers: [], inputs: [], processSteps: [], outputs: [], customers: [] },
      subSteps: [],
      tools: [],
      inputContract: {},
      outputContract: {},
      entryConditions: [],
      exitConditions: [],
      nextProcesses: [],
      previousProcesses: []
    } as ProcessDefinition,
    CONTRACTS: [],
    PATTERN: undefined,
    TESTS: { unit: [], integration: [], e2e: [] },
    TRIGGERS: { triggers: [], functions: [] }
  };
}

// Stub modules for unimplemented processes
const communicationStub = createStubModule(PROCESS_IDS.COMMUNICATION, 'Customer Communication', 'pre_service', 2);
const quotingStub = createStubModule(PROCESS_IDS.QUOTING, 'Quoting & Estimating', 'pre_service', 4);
const schedulingStub = createStubModule(PROCESS_IDS.SCHEDULING, 'Scheduling', 'pre_service', 5);
const dispatchStub = createStubModule(PROCESS_IDS.DISPATCH, 'Dispatching', 'service_delivery', 6);
const qaStub = createStubModule(PROCESS_IDS.QUALITY_ASSURANCE, 'Quality Assurance', 'service_delivery', 7);
const maintenanceStub = createStubModule(PROCESS_IDS.MAINTENANCE, 'Preventive Maintenance', 'service_delivery', 8);
const invoicingStub = createStubModule(PROCESS_IDS.INVOICING, 'Invoicing', 'post_service', 9);
const paymentStub = createStubModule(PROCESS_IDS.PAYMENT_COLLECTION, 'Payment Collection', 'post_service', 10);
const reviewsStub = createStubModule(PROCESS_IDS.REVIEW_MANAGEMENT, 'Reviews & Reputation', 'post_service', 11);
const warrantyStub = createStubModule(PROCESS_IDS.WARRANTY, 'Warranty Management', 'post_service', 12);
const inventoryStub = createStubModule(PROCESS_IDS.INVENTORY, 'Inventory Management', 'operations', 13);
const analyticsStub = createStubModule(PROCESS_IDS.ANALYTICS, 'Reporting & Analytics', 'operations', 14);
const seasonalStub = createStubModule(PROCESS_IDS.SEASONAL_PLANNING, 'Seasonal Planning', 'operations', 15);

// ============================================================================
// AGGREGATED REGISTRIES
// ============================================================================

/**
 * All process modules indexed by ID
 */
export const PROCESS_MODULES: Record<ProcessId, Partial<ProcessModule>> = {
  [PROCESS_IDS.LEAD_GENERATION]: leadGeneration,
  [PROCESS_IDS.SITE_ASSESSMENT]: siteAssessment,
  [PROCESS_IDS.COMMUNICATION]: communicationStub,
  [PROCESS_IDS.QUOTING]: quotingStub,
  [PROCESS_IDS.SCHEDULING]: schedulingStub,
  [PROCESS_IDS.DISPATCH]: dispatchStub,
  [PROCESS_IDS.QUALITY_ASSURANCE]: qaStub,
  [PROCESS_IDS.MAINTENANCE]: maintenanceStub,
  [PROCESS_IDS.INVOICING]: invoicingStub,
  [PROCESS_IDS.PAYMENT_COLLECTION]: paymentStub,
  [PROCESS_IDS.REVIEW_MANAGEMENT]: reviewsStub,
  [PROCESS_IDS.WARRANTY]: warrantyStub,
  [PROCESS_IDS.INVENTORY]: inventoryStub,
  [PROCESS_IDS.ANALYTICS]: analyticsStub,
  [PROCESS_IDS.SEASONAL_PLANNING]: seasonalStub,
};

/**
 * Auto-built process definition registry
 */
export const PROCESS_DEFINITIONS: Record<ProcessId, ProcessDefinition> = Object.fromEntries(
  Object.entries(PROCESS_MODULES).map(([id, mod]) => [id, mod.DEFINITION!])
) as Record<ProcessId, ProcessDefinition>;

/**
 * Auto-built test registry
 */
export const TEST_REGISTRY: Record<ProcessId, ProcessTestFiles> = Object.fromEntries(
  Object.entries(PROCESS_MODULES).map(([id, mod]) => [id, mod.TESTS!])
) as Record<ProcessId, ProcessTestFiles>;

/**
 * Auto-built trigger registry
 */
export const TRIGGER_REGISTRY: Record<ProcessId, ProcessTriggers> = Object.fromEntries(
  Object.entries(PROCESS_MODULES).map(([id, mod]) => [id, mod.TRIGGERS!])
) as Record<ProcessId, ProcessTriggers>;

/**
 * All tool contracts from all processes
 */
export const ALL_CONTRACTS: ToolContract[] = Object.values(PROCESS_MODULES)
  .flatMap(mod => mod.CONTRACTS || []);

/**
 * All multi-step patterns (excluding undefined)
 */
export const ALL_PATTERNS: MultiStepPattern[] = Object.values(PROCESS_MODULES)
  .map(mod => mod.PATTERN)
  .filter((p): p is MultiStepPattern => p !== undefined);

/**
 * Pattern registry indexed by ID
 */
export const PATTERN_REGISTRY: Record<string, MultiStepPattern> = Object.fromEntries(
  ALL_PATTERNS.map(p => [p.id, p])
);

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { PROCESS_IDS, ALL_PROCESS_IDS } from '../process-ids';
export type { ProcessId } from '../process-ids';
export type { ProcessModule, ProcessDefinition, ProcessTestFiles, ProcessTriggers, MultiStepPattern } from './types';

// Re-export patterns for backward compatibility
export { PATTERN as COMPLETE_LEAD_GENERATION } from './lead-generation/pattern';
export { PATTERN as COMPLETE_SITE_ASSESSMENT } from './site-assessment/pattern';

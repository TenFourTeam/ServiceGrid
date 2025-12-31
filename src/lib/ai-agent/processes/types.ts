/**
 * Shared types for process modules
 * Each process module exports these types to maintain consistency
 */

import type { ProcessId, ProcessPhase } from '../process-ids';
import type { ToolContract, Assertion, DatabaseAssertion } from '../tool-contracts';

// Re-export for convenience
export type { ProcessId, ProcessPhase, ToolContract, Assertion, DatabaseAssertion };

/**
 * Automation maturity states
 * DIY = Do It Yourself (manual, user does everything)
 * DWY = Done With You (AI-assisted, user confirms)
 * DFY = Done For You (fully automated by AI)
 */
export type AutomationState = 'DIY' | 'DWY' | 'DFY';

/**
 * SIPOC for sub-process level (detailed view)
 */
export interface SubProcessSIPOC {
  supplier: string;
  input: string;
  process: string;
  output: string;
  customer: string;
}

/**
 * SIPOC for parent process level (high-level view)
 */
export interface ProcessSIPOC {
  suppliers: string[];
  inputs: string[];
  processSteps: string[];
  outputs: string[];
  customers: string[];
}

/**
 * Enhanced sub-step with SIPOC and automation tracking
 */
export interface EnhancedSubStep {
  id: string;
  name: string;
  order: number;
  currentState: AutomationState;
  targetState: AutomationState;
  sipoc: SubProcessSIPOC;
  tools: string[];
  dbEntities: string[];
  automationCapabilities: string[];
}

/**
 * Condition for entry/exit gates
 */
export interface Condition {
  type: 'db_check' | 'context_check' | 'entity_exists' | 'status_equals';
  entity?: string;
  field?: string;
  operator?: '==' | '!=' | '>' | '<' | 'in' | 'not_null';
  value?: any;
  query?: string;
}

/**
 * Enhanced process definition with full SIPOC support
 */
export interface ProcessDefinition {
  id: ProcessId;
  name: string;
  description: string;
  phase: ProcessPhase;
  position: number;
  order: number;
  depth: 0;
  currentState: AutomationState;
  targetState: AutomationState;
  sipoc: ProcessSIPOC;
  subSteps: EnhancedSubStep[];
  tools: string[];
  inputContract: Record<string, string>;
  outputContract: Record<string, string>;
  entryConditions: Condition[];
  exitConditions: Condition[];
  userCheckpoints?: string[];
  nextProcesses: ProcessId[];
  previousProcesses: ProcessId[];
}

/**
 * Pattern step definition
 */
export interface PatternStep {
  order: number;
  tool: string;
  description: string;
  inputMapping: Record<string, string>;
  outputKey: string;
  optional?: boolean;
  skipIf?: string;
  retryOnFail?: boolean;
}

/**
 * Multi-step pattern for AI agent workflows
 */
export interface MultiStepPattern {
  id: string;
  name: string;
  description: string;
  category: 'pre-service' | 'service-delivery' | 'post-service' | 'operations';
  steps: PatternStep[];
  preconditions: string[];
  postconditions: string[];
  successMetrics: string[];
  estimatedDurationMs: number;
  specialCardType?: 'lead_workflow' | 'assessment_workflow';
}

/**
 * Test file configuration for a process
 */
export interface ProcessTestFiles {
  unit: string[];
  integration: string[];
  e2e: string[];
}

/**
 * Database trigger configuration for a process
 */
export interface ProcessTriggers {
  triggers: string[];
  functions: string[];
}

/**
 * Complete process module interface
 * Each process folder exports these fields
 */
export interface ProcessModule {
  DEFINITION: ProcessDefinition;
  CONTRACTS: ToolContract[];
  PATTERN?: MultiStepPattern;
  TESTS: ProcessTestFiles;
  TRIGGERS: ProcessTriggers;
}

/**
 * Process-EdgeFunction Alignment Types
 * 
 * Defines the mapping between processes, automation modes, and their implementations.
 * This ensures DIY, DWY, and DFY modes all produce consistent outcomes.
 */

import type { ProcessId } from '../../ai-agent/process-ids';

/**
 * Automation mode - how the work is performed
 */
export type AutomationMode = 'DIY' | 'DWY' | 'DFY';

/**
 * DIY Implementation - User performs manually via UI
 */
export interface DIYImplementation {
  /** Edge functions called by UI components */
  edgeFunctions: string[];
  /** UI components that drive the action */
  uiComponents: string[];
  /** Database tables modified */
  dbTables: string[];
  /** Description of manual workflow */
  description?: string;
}

/**
 * DWY Implementation - AI assists, user confirms
 */
export interface DWYImplementation {
  /** AI tools that can perform this action */
  tools: string[];
  /** Edge functions the tools call */
  edgeFunctions: string[];
  /** Database tables modified */
  dbTables: string[];
  /** Whether user confirmation is required */
  requiresConfirmation: boolean;
  /** Description of assisted workflow */
  description?: string;
}

/**
 * DFY Implementation - Full automation
 */
export interface DFYImplementation {
  /** Database triggers that automate this step */
  triggers: string[];
  /** Edge functions for automation */
  edgeFunctions: string[];
  /** Scheduled/cron jobs */
  scheduledJobs?: string[];
  /** Database tables modified */
  dbTables: string[];
  /** Description of automated workflow */
  description?: string;
}

/**
 * Expected outcome after step completion - should be same across all modes
 */
export interface ExpectedOutcome {
  /** Primary entity affected */
  entity: string;
  /** Expected state after completion */
  state: Record<string, unknown>;
  /** Description of expected outcome */
  description?: string;
}

/**
 * Complete mapping for a process sub-step
 */
export interface ProcessSubStepMapping {
  /** Process this step belongs to */
  processId: ProcessId;
  /** Sub-step identifier */
  subStepId: string;
  /** Human-readable name */
  name: string;
  /** DIY mode implementation */
  diy: DIYImplementation;
  /** DWY mode implementation */
  dwy: DWYImplementation;
  /** DFY mode implementation */
  dfy: DFYImplementation;
  /** Expected outcome - should be equivalent across all modes */
  expectedOutcome: ExpectedOutcome;
}

/**
 * Complete process mapping
 */
export interface ProcessMapping {
  processId: ProcessId;
  name: string;
  subSteps: ProcessSubStepMapping[];
}

/**
 * Alignment validation result
 */
export interface AlignmentValidationResult {
  processId: ProcessId;
  subStepId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Full alignment report
 */
export interface AlignmentReport {
  timestamp: Date;
  totalProcesses: number;
  mappedProcesses: number;
  totalSubSteps: number;
  mappedSubSteps: number;
  validationResults: AlignmentValidationResult[];
  missingEdgeFunctions: string[];
  missingTools: string[];
  missingTriggers: string[];
  coverageScore: number;
}

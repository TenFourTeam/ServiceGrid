/**
 * Process Implementation Validator
 * 
 * Automated verification that all processes are implemented to the
 * Process Implementation Blueprint standard.
 */

import { PROCESS_REGISTRY, type EnhancedProcessDefinition } from './process-registry';
import { getPattern } from './multi-step-patterns';
import { getToolContract } from './tool-contracts';
import { getProcessTests } from './test-registry';
import { getProcessTriggers } from './trigger-registry';
import { TEST_REGISTRY, TRIGGER_REGISTRY } from './processes';
import { ALL_PROCESS_IDS } from './process-ids';

// Alias for cleaner code
const PROCESSES = PROCESS_REGISTRY;

// ============================================================================
// TYPES
// ============================================================================

export type ValidationCategory = 
  | 'definition' 
  | 'contracts' 
  | 'pattern' 
  | 'automation' 
  | 'ui' 
  | 'testing';

export interface ValidationCheck {
  category: ValidationCategory;
  name: string;
  passed: boolean;
  required: boolean;
  details?: string;
}

export interface ProcessValidationResult {
  processId: string;
  processName: string;
  isComplete: boolean;
  score: number; // 0-100
  checks: ValidationCheck[];
  missingItems: string[];
  warnings: string[];
}

export interface ValidationSummary {
  totalProcesses: number;
  completeProcesses: number;
  averageScore: number;
  results: ProcessValidationResult[];
}

// ============================================================================
// VALIDATION CHECKS
// ============================================================================

function checkProcessDefinition(processId: string): ValidationCheck {
  const process = PROCESSES[processId];
  return {
    category: 'definition',
    name: 'Process definition exists',
    passed: !!process,
    required: true,
    details: process ? `Found: ${process.name}` : 'Missing from process-registry.ts'
  };
}

function checkSubSteps(processId: string): ValidationCheck {
  const process = PROCESSES[processId] as EnhancedProcessDefinition;
  if (!process) {
    return {
      category: 'definition',
      name: 'Sub-steps with SIPOC defined',
      passed: false,
      required: true,
      details: 'Process not found'
    };
  }
  
  const hasEnhancedSubSteps = process.subSteps?.some(
    (s: any) => s.sipoc !== undefined
  );
  
  return {
    category: 'definition',
    name: 'Sub-steps with SIPOC defined',
    passed: hasEnhancedSubSteps || false,
    required: true,
    details: hasEnhancedSubSteps 
      ? `${process.subSteps?.length || 0} sub-steps with SIPOC` 
      : 'Sub-steps missing SIPOC definitions'
  };
}

function checkToolContracts(processId: string): ValidationCheck {
  const process = PROCESSES[processId];
  if (!process) {
    return {
      category: 'contracts',
      name: 'Tool contracts defined',
      passed: false,
      required: true,
      details: 'Process not found'
    };
  }
  
  const tools = process.tools || [];
  const toolsWithContracts = tools.filter(tool => {
    const contract = getToolContract(tool);
    return contract !== undefined;
  });
  
  return {
    category: 'contracts',
    name: 'Tool contracts defined',
    passed: toolsWithContracts.length >= tools.length * 0.5, // At least 50% coverage
    required: true,
    details: `${toolsWithContracts.length}/${tools.length} tools have contracts`
  };
}

function checkMultiStepPattern(processId: string): ValidationCheck {
  // Convert process_id to pattern_id (e.g., lead_generation -> complete_lead_generation)
  const patternId = `complete_${processId}`;
  const pattern = getPattern(patternId);
  
  // Also check for the pattern directly
  const directPattern = getPattern(processId);
  const foundPattern = pattern || directPattern;
  
  return {
    category: 'pattern',
    name: 'Multi-step pattern registered',
    passed: !!foundPattern,
    required: true,
    details: foundPattern 
      ? `Pattern found: ${foundPattern.id} with ${foundPattern.steps.length} steps` 
      : `No pattern found for ${patternId} or ${processId}`
  };
}

function checkSpecialCardType(processId: string): ValidationCheck {
  const patternId = `complete_${processId}`;
  const pattern = getPattern(patternId) || getPattern(processId);
  
  if (!pattern) {
    return {
      category: 'pattern',
      name: 'Special card type defined',
      passed: false,
      required: false,
      details: 'Pattern not found'
    };
  }
  
  return {
    category: 'pattern',
    name: 'Special card type defined',
    passed: !!pattern.specialCardType,
    required: false, // Not all patterns need a special card
    details: pattern.specialCardType 
      ? `Card type: ${pattern.specialCardType}` 
      : 'No special card type (uses default)'
  };
}

function checkSuccessMetrics(processId: string): ValidationCheck {
  const patternId = `complete_${processId}`;
  const pattern = getPattern(patternId) || getPattern(processId);
  
  if (!pattern) {
    return {
      category: 'pattern',
      name: 'Success metrics defined',
      passed: false,
      required: true,
      details: 'Pattern not found'
    };
  }
  
  const hasMetrics = pattern.successMetrics && 
    (Array.isArray(pattern.successMetrics) ? pattern.successMetrics.length > 0 : true);
  
  return {
    category: 'pattern',
    name: 'Success metrics defined',
    passed: hasMetrics,
    required: true,
    details: hasMetrics ? 'Success metrics configured' : 'Missing success metrics'
  };
}

function checkRollbackTools(processId: string): ValidationCheck {
  const process = PROCESSES[processId];
  if (!process) {
    return {
      category: 'automation',
      name: 'Rollback tools configured',
      passed: false,
      required: true,
      details: 'Process not found'
    };
  }
  
  const tools = process.tools || [];
  const reversibleTools = tools.filter(tool => {
    const contract = getToolContract(tool);
    return contract?.rollbackTool !== undefined;
  });
  
  // At least 30% of tools should have rollback defined
  const threshold = Math.max(1, Math.floor(tools.length * 0.3));
  
  return {
    category: 'automation',
    name: 'Rollback tools configured',
    passed: reversibleTools.length >= threshold,
    required: true,
    details: `${reversibleTools.length}/${tools.length} tools have rollback defined`
  };
}

function checkWorkflowCard(processId: string): ValidationCheck {
  // Check if the pattern has a specialCardType, which indicates a workflow card exists
  const patternId = `complete_${processId}`;
  const pattern = getPattern(patternId) || getPattern(processId);
  
  const hasCard = pattern?.specialCardType !== undefined;
  
  return {
    category: 'ui',
    name: 'Workflow card component',
    passed: hasCard,
    required: false,
    details: hasCard 
      ? `Uses ${pattern!.specialCardType} card` 
      : 'No dedicated workflow card (uses default)'
  };
}

function checkPreconditions(processId: string): ValidationCheck {
  const patternId = `complete_${processId}`;
  const pattern = getPattern(patternId) || getPattern(processId);
  
  if (!pattern) {
    return {
      category: 'definition',
      name: 'Preconditions defined',
      passed: false,
      required: true,
      details: 'Pattern not found'
    };
  }
  
  const hasPreconditions = pattern.preconditions && pattern.preconditions.length > 0;
  
  return {
    category: 'definition',
    name: 'Preconditions defined',
    passed: hasPreconditions,
    required: true,
    details: hasPreconditions 
      ? `${pattern.preconditions.length} preconditions` 
      : 'No preconditions defined'
  };
}

function checkPostconditions(processId: string): ValidationCheck {
  const patternId = `complete_${processId}`;
  const pattern = getPattern(patternId) || getPattern(processId);
  
  if (!pattern) {
    return {
      category: 'definition',
      name: 'Postconditions defined',
      passed: false,
      required: true,
      details: 'Pattern not found'
    };
  }
  
  const hasPostconditions = pattern.postconditions && pattern.postconditions.length > 0;
  
  return {
    category: 'definition',
    name: 'Postconditions defined',
    passed: hasPostconditions,
    required: true,
    details: hasPostconditions 
      ? `${pattern.postconditions.length} postconditions` 
      : 'No postconditions defined'
  };
}

// ============================================================================
// TESTING LAYER CHECKS
// ============================================================================

function checkUnitTests(processId: string): ValidationCheck {
  const tests = getProcessTests(processId);
  const hasTests = tests.unit.length > 0;
  
  return {
    category: 'testing',
    name: 'Unit tests exist',
    passed: hasTests,
    required: false, // Recommended but not blocking
    details: hasTests 
      ? `${tests.unit.length} unit test file(s): ${tests.unit.join(', ')}` 
      : 'No unit tests found'
  };
}

function checkIntegrationTests(processId: string): ValidationCheck {
  const tests = getProcessTests(processId);
  const hasTests = tests.integration.length > 0;
  
  return {
    category: 'testing',
    name: 'Integration tests exist',
    passed: hasTests,
    required: false,
    details: hasTests 
      ? `${tests.integration.length} integration test file(s)` 
      : 'No integration tests found'
  };
}

function checkE2ETests(processId: string): ValidationCheck {
  const tests = getProcessTests(processId);
  const hasTests = tests.e2e.length > 0;
  
  return {
    category: 'testing',
    name: 'E2E tests exist',
    passed: hasTests,
    required: false,
    details: hasTests 
      ? `${tests.e2e.length} E2E test file(s): ${tests.e2e.join(', ')}` 
      : 'No E2E tests found'
  };
}

// ============================================================================
// DATABASE AUTOMATION CHECKS
// ============================================================================

function checkDatabaseTriggers(processId: string): ValidationCheck {
  const config = getProcessTriggers(processId);
  const hasTriggers = config.triggers.length > 0;
  
  return {
    category: 'automation',
    name: 'Database triggers configured',
    passed: hasTriggers,
    required: false, // Not all processes need DB triggers
    details: hasTriggers 
      ? `${config.triggers.length} trigger(s): ${config.triggers.join(', ')}` 
      : 'No database triggers defined'
  };
}

function checkCrossRegistryConsistency(processId: string): ValidationCheck {
  const inProcessRegistry = !!PROCESSES[processId];
  const inTestRegistry = !!TEST_REGISTRY[processId as keyof typeof TEST_REGISTRY];
  const inTriggerRegistry = !!TRIGGER_REGISTRY[processId as keyof typeof TRIGGER_REGISTRY];
  
  const allPresent = inProcessRegistry && inTestRegistry && inTriggerRegistry;
  const missing: string[] = [];
  
  if (!inProcessRegistry) missing.push('process-registry');
  if (!inTestRegistry) missing.push('test-registry');
  if (!inTriggerRegistry) missing.push('trigger-registry');
  
  return {
    category: 'definition',
    name: 'Cross-registry consistency',
    passed: allPresent,
    required: true,
    details: allPresent 
      ? 'Present in all registries'
      : `Missing from: ${missing.join(', ')}`
  };
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export function validateProcessImplementation(processId: string): ProcessValidationResult {
  const process = PROCESSES[processId];
  const checks: ValidationCheck[] = [];
  
  // PHASE 1: Definition Layer
  checks.push(checkProcessDefinition(processId));
  checks.push(checkSubSteps(processId));
  checks.push(checkPreconditions(processId));
  checks.push(checkPostconditions(processId));
  
  // PHASE 2: Contracts Layer
  checks.push(checkToolContracts(processId));
  
  // PHASE 3: Pattern Layer
  checks.push(checkMultiStepPattern(processId));
  checks.push(checkSpecialCardType(processId));
  checks.push(checkSuccessMetrics(processId));
  
  // PHASE 4: Automation Layer
  checks.push(checkRollbackTools(processId));
  
  // PHASE 5: UI Layer
  checks.push(checkWorkflowCard(processId));
  
  // PHASE 6: Testing Layer
  checks.push(checkUnitTests(processId));
  checks.push(checkIntegrationTests(processId));
  checks.push(checkE2ETests(processId));
  
  // PHASE 7: Database Automation Layer
  checks.push(checkDatabaseTriggers(processId));
  
  // PHASE 8: Cross-Registry Consistency
  checks.push(checkCrossRegistryConsistency(processId));
  
  // Calculate results
  const passed = checks.filter(c => c.passed);
  const required = checks.filter(c => c.required);
  const requiredPassed = required.filter(c => c.passed);
  
  return {
    processId,
    processName: process?.name || processId,
    isComplete: requiredPassed.length === required.length,
    score: Math.round((passed.length / checks.length) * 100),
    checks,
    missingItems: checks.filter(c => !c.passed && c.required).map(c => c.name),
    warnings: checks.filter(c => !c.passed && !c.required).map(c => c.name),
  };
}

export function validateAllProcesses(): ValidationSummary {
  // Use ALL_PROCESS_IDS to ensure we validate all 15 processes
  const processIds = ALL_PROCESS_IDS;
  const results = processIds.map(id => validateProcessImplementation(id));
  
  const completeProcesses = results.filter(r => r.isComplete).length;
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  
  return {
    totalProcesses: processIds.length,
    completeProcesses,
    averageScore: Math.round(totalScore / processIds.length),
    results,
  };
}

// ============================================================================
// CONSOLE REPORTER (for CLI usage)
// ============================================================================

export function printValidationResult(result: ProcessValidationResult): void {
  const emoji = result.isComplete ? '✅' : '❌';
  console.log(`\n${emoji} ${result.processName} (${result.processId}): ${result.score}% complete`);
  
  if (result.missingItems.length > 0) {
    console.log('  Missing (required):');
    result.missingItems.forEach(item => console.log(`    ❌ ${item}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('  Warnings (optional):');
    result.warnings.forEach(item => console.log(`    ⚠️ ${item}`));
  }
  
  // Show passed checks
  const passedChecks = result.checks.filter(c => c.passed);
  if (passedChecks.length > 0) {
    console.log('  Passed:');
    passedChecks.forEach(check => console.log(`    ✅ ${check.name}${check.details ? ` - ${check.details}` : ''}`));
  }
}

export function printValidationSummary(summary: ValidationSummary): void {
  console.log('\n' + '='.repeat(60));
  console.log('PROCESS IMPLEMENTATION VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Processes: ${summary.totalProcesses}`);
  console.log(`Complete: ${summary.completeProcesses}/${summary.totalProcesses}`);
  console.log(`Average Score: ${summary.averageScore}%`);
  console.log('='.repeat(60));
  
  summary.results.forEach(printValidationResult);
}

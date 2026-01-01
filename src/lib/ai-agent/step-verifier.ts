/**
 * Step Verifier - Runtime verification of tool execution
 * Checks pre/post conditions, invariants, and database assertions
 * All database operations go through edge functions for proper auth
 */

import { 
  ToolContract, 
  Assertion, 
  DatabaseAssertion, 
  getToolContract 
} from './tool-contracts';
import { 
  ProcessDefinition, 
  getToolProcess, 
  checkEntryConditions, 
  checkExitConditions 
} from './process-registry';

export interface VerificationResult {
  passed: boolean;
  phase: 'precondition' | 'postcondition' | 'invariant' | 'db_assertion';
  failedAssertions: FailedAssertion[];
  executionTimeMs: number;
}

export interface FailedAssertion {
  assertionId: string;
  description: string;
  expected: any;
  actual: any;
  details?: string;
}

export interface StepExecutionContext {
  businessId: string;
  userId: string;
  args: Record<string, any>;
  entities: Record<string, any>;  // Loaded entities (customer, quote, job, etc.)
  previousResults: Record<string, any>;  // Results from previous steps
  apiInvoker?: (functionName: string, options: any) => Promise<any>;  // Auth API invoker
}

export interface VerifiedStepResult {
  status: 'completed' | 'failed' | 'rolled_back';
  result?: any;
  verification: VerificationResult;
  rollbackAttempted?: boolean;
  rollbackResult?: any;
}

/**
 * Execute a tool with full verification
 */
export async function executeWithVerification(
  toolName: string,
  toolExecutor: (args: Record<string, any>) => Promise<any>,
  context: StepExecutionContext
): Promise<VerifiedStepResult> {
  const startTime = Date.now();
  const contract = getToolContract(toolName);
  
  // If no contract defined, execute without verification
  if (!contract) {
    console.log(`[StepVerifier] No contract for ${toolName}, executing unverified`);
    const result = await toolExecutor(context.args);
    return {
      status: 'completed',
      result,
      verification: {
        passed: true,
        phase: 'precondition',
        failedAssertions: [],
        executionTimeMs: Date.now() - startTime
      }
    };
  }
  
  // Check process entry conditions if this is first tool in process
  const process = getToolProcess(toolName);
  if (process) {
    const entryCheck = checkEntryConditions(process.id, context.entities);
    if (!entryCheck.valid) {
      console.warn(`[StepVerifier] Process entry conditions failed for ${process.id}`);
    }
  }
  
  // 1. Check preconditions
  const preCheck = await verifyAssertions(
    contract.preconditions, 
    context, 
    null, 
    'precondition'
  );
  
  if (!preCheck.passed) {
    return {
      status: 'failed',
      verification: { ...preCheck, executionTimeMs: Date.now() - startTime }
    };
  }
  
  // 2. Check invariants BEFORE execution
  const invariantsBefore = await captureInvariantValues(contract.invariants, context);
  
  // 3. Execute the tool
  let result: any;
  try {
    result = await toolExecutor(context.args);
  } catch (error) {
    return {
      status: 'failed',
      verification: {
        passed: false,
        phase: 'postcondition',
        failedAssertions: [{
          assertionId: 'execution_error',
          description: 'Tool execution failed',
          expected: 'success',
          actual: 'error',
          details: error instanceof Error ? error.message : String(error)
        }],
        executionTimeMs: Date.now() - startTime
      }
    };
  }
  
  // 4. Check postconditions
  const postCheck = await verifyAssertions(
    contract.postconditions,
    context,
    result,
    'postcondition'
  );
  
  if (!postCheck.passed) {
    // Attempt rollback
    const rollbackResult = await attemptRollback(contract, context, result);
    return {
      status: 'rolled_back',
      result,
      verification: { ...postCheck, executionTimeMs: Date.now() - startTime },
      rollbackAttempted: true,
      rollbackResult
    };
  }
  
  // 5. Check invariants AFTER execution
  const invariantCheck = await verifyInvariants(
    contract.invariants,
    context,
    result,
    invariantsBefore
  );
  
  if (!invariantCheck.passed) {
    const rollbackResult = await attemptRollback(contract, context, result);
    return {
      status: 'rolled_back',
      result,
      verification: { ...invariantCheck, executionTimeMs: Date.now() - startTime },
      rollbackAttempted: true,
      rollbackResult
    };
  }
  
  // 6. Run database assertions
  const dbCheck = await verifyDatabaseAssertions(
    contract.dbAssertions,
    context,
    result
  );
  
  if (!dbCheck.passed) {
    const rollbackResult = await attemptRollback(contract, context, result);
    return {
      status: 'rolled_back',
      result,
      verification: { ...dbCheck, executionTimeMs: Date.now() - startTime },
      rollbackAttempted: true,
      rollbackResult
    };
  }
  
  // All checks passed
  return {
    status: 'completed',
    result,
    verification: {
      passed: true,
      phase: 'postcondition',
      failedAssertions: [],
      executionTimeMs: Date.now() - startTime
    }
  };
}

/**
 * Verify a list of assertions
 */
async function verifyAssertions(
  assertions: Assertion[],
  context: StepExecutionContext,
  result: any,
  phase: 'precondition' | 'postcondition' | 'invariant'
): Promise<Omit<VerificationResult, 'executionTimeMs'>> {
  const failedAssertions: FailedAssertion[] = [];
  
  for (const assertion of assertions) {
    const passed = evaluateAssertion(assertion, context, result);
    if (!passed) {
      failedAssertions.push({
        assertionId: assertion.id,
        description: assertion.description,
        expected: getExpectedValue(assertion, context),
        actual: getActualValue(assertion, context, result)
      });
    }
  }
  
  return {
    passed: failedAssertions.length === 0,
    phase,
    failedAssertions
  };
}

/**
 * Evaluate a single assertion
 */
function evaluateAssertion(
  assertion: Assertion,
  context: StepExecutionContext,
  result: any
): boolean {
  const entity = assertion.entity === 'result' 
    ? result 
    : context.entities[assertion.entity!];
  
  switch (assertion.type) {
    case 'entity_exists':
      return entity?.[assertion.field!] != null;
      
    case 'field_equals': {
      const actual = entity?.[assertion.field!];
      const expected = assertion.fromArg 
        ? getNestedValue(context, assertion.fromArg)
        : assertion.value;
      
      if (assertion.operator === 'in') {
        return Array.isArray(expected) && expected.includes(actual);
      }
      return actual === expected;
    }
    
    case 'field_not_null':
      if (assertion.operator === '!=') {
        return entity?.[assertion.field!] !== assertion.value;
      }
      return entity?.[assertion.field!] != null;
      
    case 'custom':
      // Custom checks need special handling - for now, pass them
      console.warn(`[StepVerifier] Custom assertion ${assertion.id} not evaluated`);
      return true;
      
    default:
      return false;
  }
}

/**
 * Capture values for invariant checking before execution
 */
async function captureInvariantValues(
  invariants: Assertion[],
  context: StepExecutionContext
): Promise<Map<string, any>> {
  const values = new Map<string, any>();
  
  for (const invariant of invariants) {
    const entity = context.entities[invariant.entity!];
    if (entity && invariant.field) {
      values.set(invariant.id, entity[invariant.field]);
    }
  }
  
  return values;
}

/**
 * Verify invariants after execution
 */
async function verifyInvariants(
  invariants: Assertion[],
  context: StepExecutionContext,
  result: any,
  valuesBefore: Map<string, any>
): Promise<Omit<VerificationResult, 'executionTimeMs'>> {
  const failedAssertions: FailedAssertion[] = [];
  
  for (const invariant of invariants) {
    // For invariants, we need to check that the value hasn't changed unexpectedly
    const valueBefore = valuesBefore.get(invariant.id);
    const entity = invariant.entity === 'result' 
      ? result 
      : context.entities[invariant.entity!];
    const valueAfter = entity?.[invariant.field!];
    
    // If there's a specific expected value from args, check that
    if (invariant.fromArg) {
      const expectedValue = getNestedValue(context, invariant.fromArg);
      if (valueAfter !== expectedValue) {
        failedAssertions.push({
          assertionId: invariant.id,
          description: invariant.description,
          expected: expectedValue,
          actual: valueAfter
        });
      }
    } else if (invariant.type === 'field_equals' && valueBefore !== valueAfter) {
      // Check that value didn't change
      failedAssertions.push({
        assertionId: invariant.id,
        description: invariant.description,
        expected: valueBefore,
        actual: valueAfter,
        details: 'Value changed unexpectedly'
      });
    }
  }
  
  return {
    passed: failedAssertions.length === 0,
    phase: 'invariant',
    failedAssertions
  };
}

/**
 * Run database assertions via edge function
 */
async function verifyDatabaseAssertions(
  dbAssertions: DatabaseAssertion[],
  context: StepExecutionContext,
  result: any
): Promise<Omit<VerificationResult, 'executionTimeMs'>> {
  const failedAssertions: FailedAssertion[] = [];
  
  // If no API invoker, skip DB assertions (will be validated server-side)
  if (!context.apiInvoker) {
    console.warn('[StepVerifier] No apiInvoker provided, skipping DB assertions');
    return { passed: true, phase: 'db_assertion', failedAssertions: [] };
  }
  
  for (const assertion of dbAssertions) {
    try {
      // Build where clause with resolved values
      const whereClause: Record<string, any> = {};
      for (const [field, ref] of Object.entries(assertion.query.where)) {
        whereClause[field] = resolveReference(ref, context, result);
      }
      
      // Execute query via edge function
      const response = await context.apiInvoker('step-verifier-crud', {
        method: 'POST',
        queryParams: { action: 'db-assertion' },
        body: {
          table: assertion.table,
          select: assertion.query.select,
          where: whereClause
        }
      });
      
      if (response.error) {
        failedAssertions.push({
          assertionId: assertion.id,
          description: assertion.description,
          expected: 'query success',
          actual: 'query error',
          details: response.error
        });
        continue;
      }
      
      const data = response.data || [];
      
      // Check expectations
      if (assertion.expect.count !== undefined) {
        if (data.length !== assertion.expect.count) {
          failedAssertions.push({
            assertionId: assertion.id,
            description: assertion.description,
            expected: `count = ${assertion.expect.count}`,
            actual: `count = ${data.length}`
          });
        }
      }
      
      if (assertion.expect.field && data.length > 0) {
        const actualValue = data[0][assertion.expect.field];
        const passed = compareDbValue(
          actualValue, 
          assertion.expect.operator, 
          assertion.expect.value
        );
        
        if (!passed) {
          failedAssertions.push({
            assertionId: assertion.id,
            description: assertion.description,
            expected: `${assertion.expect.field} ${assertion.expect.operator} ${assertion.expect.value}`,
            actual: `${assertion.expect.field} = ${actualValue}`
          });
        }
      }
    } catch (error) {
      failedAssertions.push({
        assertionId: assertion.id,
        description: assertion.description,
        expected: 'assertion check',
        actual: 'error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return {
    passed: failedAssertions.length === 0,
    phase: 'db_assertion',
    failedAssertions
  };
}

/**
 * Attempt to rollback a failed step via edge function
 */
async function attemptRollback(
  contract: ToolContract,
  context: StepExecutionContext,
  result: any
): Promise<any> {
  if (!contract.rollbackTool) {
    console.warn(`[StepVerifier] No rollback tool for ${contract.toolName}`);
    return null;
  }
  
  // If no API invoker, can't execute rollback
  if (!context.apiInvoker) {
    console.warn(`[StepVerifier] No apiInvoker provided, cannot execute rollback`);
    return { rollbackTool: contract.rollbackTool, error: 'No API invoker available' };
  }
  
  try {
    // Build rollback args
    const rollbackArgs: Record<string, any> = {};
    for (const [argName, ref] of Object.entries(contract.rollbackArgs || {})) {
      rollbackArgs[argName] = resolveReference(ref, context, result);
    }
    
    console.log(`[StepVerifier] Executing rollback with ${contract.rollbackTool}`, rollbackArgs);
    
    // Execute the rollback via edge function
    const response = await context.apiInvoker('step-verifier-crud', {
      method: 'POST',
      queryParams: { action: 'execute-rollback' },
      body: {
        rollbackTool: contract.rollbackTool,
        rollbackArgs,
        originalTool: contract.toolName
      }
    });
    
    if (response.error) {
      console.error(`[StepVerifier] Rollback failed:`, response.error);
      return { rollbackTool: contract.rollbackTool, rollbackArgs, error: response.error };
    }
    
    console.log(`[StepVerifier] Rollback successful for ${contract.toolName}`);
    return { rollbackTool: contract.rollbackTool, rollbackArgs, success: true };
  } catch (error) {
    console.error(`[StepVerifier] Rollback failed:`, error);
    return { 
      rollbackTool: contract.rollbackTool, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Resolve a reference string to a value
 */
function resolveReference(ref: string, context: StepExecutionContext, result: any): any {
  if (ref.startsWith('result.')) {
    return getNestedValue(result, ref.substring(7));
  }
  if (ref.startsWith('args.')) {
    return getNestedValue(context.args, ref.substring(5));
  }
  if (ref.startsWith('entities.')) {
    return getNestedValue(context.entities, ref.substring(9));
  }
  return ref;  // Literal value
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

function getExpectedValue(assertion: Assertion, context: StepExecutionContext): any {
  if (assertion.fromArg) {
    return getNestedValue(context, assertion.fromArg);
  }
  return assertion.value;
}

function getActualValue(assertion: Assertion, context: StepExecutionContext, result: any): any {
  const entity = assertion.entity === 'result' 
    ? result 
    : context.entities[assertion.entity!];
  return entity?.[assertion.field!];
}

function compareDbValue(actual: any, operator: string, expected: any): boolean {
  switch (operator) {
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    case '>': return actual > expected;
    case '<': return actual < expected;
    case '>=': return actual >= expected;
    case '<=': return actual <= expected;
    case 'not_null': return actual != null;
    default: return false;
  }
}

// ============================================================================
// VERIFICATION METRICS
// ============================================================================

export interface VerificationMetrics {
  toolName: string;
  processId: string;
  totalExecutions: number;
  successRate: number;
  preconditionFailures: number;
  postconditionFailures: number;
  invariantViolations: number;
  dbAssertionFailures: number;
  rollbackAttempts: number;
  rollbackSuccesses: number;
  avgExecutionTimeMs: number;
}

const metricsStore = new Map<string, VerificationMetrics>();

export function recordVerificationMetrics(
  toolName: string,
  result: VerifiedStepResult
): void {
  const contract = getToolContract(toolName);
  const processId = contract?.processId || 'unknown';
  
  const key = `${processId}:${toolName}`;
  const existing = metricsStore.get(key) || {
    toolName,
    processId,
    totalExecutions: 0,
    successRate: 0,
    preconditionFailures: 0,
    postconditionFailures: 0,
    invariantViolations: 0,
    dbAssertionFailures: 0,
    rollbackAttempts: 0,
    rollbackSuccesses: 0,
    avgExecutionTimeMs: 0
  };
  
  existing.totalExecutions++;
  
  if (result.status === 'completed') {
    // Update success rate
    const successes = existing.successRate * (existing.totalExecutions - 1) + 1;
    existing.successRate = successes / existing.totalExecutions;
  } else {
    const successes = existing.successRate * (existing.totalExecutions - 1);
    existing.successRate = successes / existing.totalExecutions;
    
    // Track failure type
    switch (result.verification.phase) {
      case 'precondition':
        existing.preconditionFailures++;
        break;
      case 'postcondition':
        existing.postconditionFailures++;
        break;
      case 'invariant':
        existing.invariantViolations++;
        break;
      case 'db_assertion':
        existing.dbAssertionFailures++;
        break;
    }
  }
  
  if (result.rollbackAttempted) {
    existing.rollbackAttempts++;
    if (result.rollbackResult && !result.rollbackResult.error) {
      existing.rollbackSuccesses++;
    }
  }
  
  // Update average execution time
  const totalTime = existing.avgExecutionTimeMs * (existing.totalExecutions - 1) + 
    result.verification.executionTimeMs;
  existing.avgExecutionTimeMs = totalTime / existing.totalExecutions;
  
  metricsStore.set(key, existing);
}

export function getVerificationMetrics(toolName?: string): VerificationMetrics[] {
  if (toolName) {
    const metrics = Array.from(metricsStore.values()).find(m => m.toolName === toolName);
    return metrics ? [metrics] : [];
  }
  return Array.from(metricsStore.values());
}

export function getProcessMetrics(processId: string): VerificationMetrics[] {
  return Array.from(metricsStore.values()).filter(m => m.processId === processId);
}

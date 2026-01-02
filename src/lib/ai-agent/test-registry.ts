/**
 * Test Registry - Maps processes to their test files
 * 
 * NOTE: This file now re-exports from the modular process structure.
 * For new processes, add tests.ts to the process module folder instead.
 */

import { PROCESS_IDS } from './process-ids';
import { TEST_REGISTRY } from './processes';
import type { ProcessTestFiles } from './processes/types';

// Re-export the auto-aggregated registry
export { TEST_REGISTRY as PROCESS_TEST_REGISTRY };
export type { ProcessTestFiles };

/**
 * Get test files for a process
 */
export function getProcessTests(processId: string): ProcessTestFiles {
  return TEST_REGISTRY[processId as keyof typeof TEST_REGISTRY] || { unit: [], integration: [], e2e: [] };
}

/**
 * Check if a process has unit tests
 */
export function hasUnitTests(processId: string): boolean {
  return getProcessTests(processId).unit.length > 0;
}

/**
 * Check if a process has integration tests
 */
export function hasIntegrationTests(processId: string): boolean {
  return getProcessTests(processId).integration.length > 0;
}

/**
 * Check if a process has E2E tests
 */
export function hasE2ETests(processId: string): boolean {
  return getProcessTests(processId).e2e.length > 0;
}

/**
 * Test Registry - Maps processes to their test files
 * 
 * This registry tracks which test files exist for each process,
 * enabling the validator to verify testing layer completeness.
 */

export interface ProcessTestFiles {
  unit: string[];
  integration: string[];
  e2e: string[];
}

/**
 * Registry of known test files for each process
 * Update this when adding new tests
 */
export const PROCESS_TEST_REGISTRY: Record<string, ProcessTestFiles> = {
  'lead_generation': {
    unit: ['tests/unit/lead-generation.unit.test.ts'],
    integration: [],
    e2e: ['tests/e2e/lead-generation.e2e.test.ts']
  },
  'site_assessment': {
    unit: ['tests/unit/site-assessment.unit.test.ts'],
    integration: ['tests/integration/site-assessment.integration.test.ts'],
    e2e: ['tests/e2e/site-assessment.e2e.test.ts']
  },
  // Other processes - add test files as they are created
  'communication': { unit: [], integration: [], e2e: [] },
  'quoting': { unit: [], integration: [], e2e: [] },
  'scheduling': { unit: [], integration: [], e2e: [] },
  'dispatch': { unit: [], integration: [], e2e: [] },
  'quality_assurance': { unit: [], integration: [], e2e: [] },
  'maintenance': { unit: [], integration: [], e2e: [] },
  'invoicing': { unit: [], integration: [], e2e: [] },
  'payment_collection': { unit: [], integration: [], e2e: [] },
  'review_management': { unit: [], integration: [], e2e: [] },
  'warranty': { unit: [], integration: [], e2e: [] },
  'inventory': { unit: [], integration: [], e2e: [] },
  'analytics': { unit: [], integration: [], e2e: [] },
  'seasonal_planning': { unit: [], integration: [], e2e: [] },
};

/**
 * Get test files for a process
 */
export function getProcessTests(processId: string): ProcessTestFiles {
  return PROCESS_TEST_REGISTRY[processId] || { unit: [], integration: [], e2e: [] };
}

/**
 * Check if a process has unit tests
 */
export function hasUnitTests(processId: string): boolean {
  const tests = getProcessTests(processId);
  return tests.unit.length > 0;
}

/**
 * Check if a process has integration tests
 */
export function hasIntegrationTests(processId: string): boolean {
  const tests = getProcessTests(processId);
  return tests.integration.length > 0;
}

/**
 * Check if a process has E2E tests
 */
export function hasE2ETests(processId: string): boolean {
  const tests = getProcessTests(processId);
  return tests.e2e.length > 0;
}

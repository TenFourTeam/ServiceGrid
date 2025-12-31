/**
 * Scheduling Test Registry
 */

import type { ProcessTestFiles } from '../types';

export const TESTS: ProcessTestFiles = {
  unit: ['tests/unit/scheduling.unit.test.ts'],
  integration: ['tests/integration/scheduling.integration.test.ts'],
  e2e: ['tests/e2e/scheduling.e2e.test.ts']
};

/**
 * Quoting Test Registry
 */

import type { ProcessTestFiles } from '../types';

export const TESTS: ProcessTestFiles = {
  unit: ['tests/unit/quoting.unit.test.ts'],
  integration: ['tests/integration/quoting.integration.test.ts'],
  e2e: ['tests/e2e/quoting.e2e.test.ts']
};

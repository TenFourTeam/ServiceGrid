/**
 * Customer Communication Test Registry
 */

import type { ProcessTestFiles } from '../types';

export const TESTS: ProcessTestFiles = {
  unit: ['tests/unit/communication.unit.test.ts'],
  integration: ['tests/integration/communication.integration.test.ts'],
  e2e: ['tests/e2e/communication.e2e.test.ts']
};

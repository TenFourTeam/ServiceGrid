/**
 * Site Assessment Test Registry
 */

import type { ProcessTestFiles } from '../types';

export const TESTS: ProcessTestFiles = {
  unit: ['tests/unit/site-assessment.unit.test.ts'],
  integration: ['tests/integration/site-assessment.integration.test.ts'],
  e2e: ['tests/e2e/site-assessment.e2e.test.ts']
};

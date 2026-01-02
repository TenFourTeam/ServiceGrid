/**
 * Lead Generation Test Registry
 */

import type { ProcessTestFiles } from '../types';

export const TESTS: ProcessTestFiles = {
  unit: ['tests/unit/lead-generation.unit.test.ts'],
  integration: [],
  e2e: ['tests/e2e/lead-generation.e2e.test.ts']
};

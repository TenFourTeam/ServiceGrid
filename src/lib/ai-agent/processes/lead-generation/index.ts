/**
 * Lead Generation Process Module
 * 
 * This module exports all components of the Lead Generation process:
 * - Definition: SIPOC structure and process metadata
 * - Contracts: Tool contracts with pre/post conditions
 * - Pattern: Multi-step workflow pattern
 * - Tests: Test file registry
 * - Triggers: Database trigger registry
 */

export { DEFINITION } from './definition';
export { CONTRACTS } from './contracts';
export { PATTERN } from './pattern';
export { TESTS } from './tests';
export { TRIGGERS } from './triggers';

// Re-export individual contracts for direct access
export {
  CREATE_CUSTOMER_CONTRACT,
  SCORE_LEAD_CONTRACT,
  CREATE_REQUEST_CONTRACT,
  AUTO_ASSIGN_LEAD_CONTRACT,
} from './contracts';

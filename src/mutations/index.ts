/**
 * Centralized mutations export - single import point for all mutations
 */
export { useStandardMutation } from './useStandardMutation';
export { useProfileUpdate } from './useProfileUpdate';
// useCustomerMutations removed - using direct API calls instead
export { useJobMutations } from './useJobMutations';
export { useQuoteMutations } from './useQuoteMutations';
export { useInvoiceMutations } from './useInvoiceMutations';
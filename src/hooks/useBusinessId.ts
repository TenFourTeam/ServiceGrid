import { useBusinessContext } from '@/hooks/useBusinessContext';

/**
 * Targeted hook for components that only need the business ID
 * Reduces unnecessary re-renders compared to useBusinessContext
 */
export function useBusinessId() {
  const { businessId } = useBusinessContext();
  return businessId;
}
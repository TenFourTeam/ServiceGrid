import { useBusinessContext } from '@/hooks/useBusinessContext';

/**
 * Targeted hook for components that only need business role/permissions
 * Reduces unnecessary re-renders compared to useBusinessContext
 */
export function useBusinessRole() {
  const { role, canManage } = useBusinessContext();
  return { role, canManage };
}
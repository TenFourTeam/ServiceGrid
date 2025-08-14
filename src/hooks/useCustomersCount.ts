import { useQuery } from "@tanstack/react-query";
import { useAuthSnapshot } from "@/auth";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { qk } from "@/queries/keys";

/**
 * Count-only query for customers (performance optimized for onboarding)
 * Uses head-only request to avoid fetching full data
 */
export function useCustomersCount(opts?: { enabled?: boolean }) {
  const { snapshot } = useAuthSnapshot();
  const enabled = snapshot.phase === 'authenticated' && (opts?.enabled ?? true);

  return useQuery({
    queryKey: qk.customersCount(snapshot.businessId || ''),
    enabled: enabled && !!snapshot.businessId,
    queryFn: async (): Promise<number> => {
      console.info("[useCustomersCount] fetching count...");
      const data = await edgeRequest(`${fn('customers')}?count=true`, {
        method: 'GET',
      });
      
      const count = data?.count ?? 0;
      console.info("[useCustomersCount] count:", count);
      return count;
    },
    staleTime: 30_000, // 30 seconds
  });
}
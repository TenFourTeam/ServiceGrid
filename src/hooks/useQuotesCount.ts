import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/auth";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";

/**
 * Count-only query for quotes (performance optimized for onboarding)
 * Uses head-only request to avoid fetching full data
 */
export function useQuotesCount(opts?: { enabled?: boolean }) {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && (opts?.enabled ?? true);

  return useQuery({
    queryKey: queryKeys.counts.quotes(businessId || ''),
    enabled: enabled && !!businessId,
    queryFn: async (): Promise<number> => {
      console.info("[useQuotesCount] fetching count...");
      const data = await edgeRequest(`${fn('quotes')}?count=true`, {
        method: 'GET',
      });
      
      const count = data?.count ?? 0;
      console.info("[useQuotesCount] count:", count);
      return count;
    },
    staleTime: 30_000, // 30 seconds
  });
}
import { useQuery } from "@tanstack/react-query";
import { useBusinessAuth } from "@/auth";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { qk } from "@/queries/keys";

/**
 * Count-only query for quotes (performance optimized for onboarding)
 * Uses head-only request to avoid fetching full data
 */
export function useQuotesCount(opts?: { enabled?: boolean }) {
  const { snapshot } = useBusinessAuth();
  const enabled = snapshot.phase === 'authenticated' && (opts?.enabled ?? true);

  return useQuery({
    queryKey: qk.quotesCount(snapshot.businessId || ''),
    enabled: enabled && !!snapshot.businessId,
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
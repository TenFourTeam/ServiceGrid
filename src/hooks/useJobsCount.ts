import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";

/**
 * Count-only query for jobs (performance optimized for onboarding)
 * Uses head-only request to avoid fetching full data
 */
export function useJobsCount(opts?: { enabled?: boolean }) {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && (opts?.enabled ?? true);

  return useQuery({
    queryKey: queryKeys.counts.jobs(businessId || ''),
    enabled: enabled && !!businessId,
    queryFn: async (): Promise<number> => {
      console.info("[useJobsCount] fetching count...");
      const data = await edgeRequest(`${fn('jobs')}?count=true`, {
        method: 'GET',
      });
      
      const count = data?.count ?? 0;
      console.info("[useJobsCount] count:", count);
      return count;
    },
    staleTime: 30_000, // 30 seconds
  });
}
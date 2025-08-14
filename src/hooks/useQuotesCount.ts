import { useQuery } from "@tanstack/react-query";
import { useAuthSnapshot } from "@/auth";
import { useApiClient } from "@/auth";
import { qk } from "@/queries/keys";

/**
 * Count-only query for quotes (performance optimized for onboarding)
 * Uses head-only request to avoid fetching full data
 */
export function useQuotesCount(opts?: { enabled?: boolean }) {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && (opts?.enabled ?? true);

  return useQuery({
    queryKey: qk.quotesCount(snapshot.businessId || ''),
    enabled: enabled && !!snapshot.businessId,
    queryFn: async (): Promise<number> => {
      console.info("[useQuotesCount] fetching count...");
      const response = await apiClient.get("/quotes?count=true");
      if (response.error) throw new Error(response.error);
      
      const count = response.data?.count ?? 0;
      console.info("[useQuotesCount] count:", count);
      return count;
    },
    staleTime: 30_000, // 30 seconds
  });
}
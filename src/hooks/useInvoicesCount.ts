import { useQuery } from "@tanstack/react-query";
import { useBusinessAuth } from "@/auth";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { qk } from "@/queries/keys";

/**
 * Count-only query for invoices (performance optimized for onboarding)
 * Uses head-only request to avoid fetching full data
 */
export function useInvoicesCount(opts?: { enabled?: boolean }) {
  const { snapshot } = useBusinessAuth();
  const enabled = snapshot.phase === 'authenticated' && (opts?.enabled ?? true);

  return useQuery({
    queryKey: qk.invoicesCount(snapshot.businessId || ''),
    enabled: enabled && !!snapshot.businessId,
    queryFn: async (): Promise<number> => {
      console.info("[useInvoicesCount] fetching count...");
      const data = await edgeRequest(`${fn('invoices')}?count=true`, {
        method: 'GET',
      });
      
      const count = data?.count ?? 0;
      console.info("[useInvoicesCount] count:", count);
      return count;
    },
    staleTime: 30_000, // 30 seconds
  });
}
import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/auth";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { qk } from "@/queries/keys";

/**
 * Count-only query for invoices (performance optimized for onboarding)
 * Uses head-only request to avoid fetching full data
 */
export function useInvoicesCount(opts?: { enabled?: boolean }) {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && (opts?.enabled ?? true);

  return useQuery({
    queryKey: qk.invoicesCount(businessId || ''),
    enabled: enabled && !!businessId,
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
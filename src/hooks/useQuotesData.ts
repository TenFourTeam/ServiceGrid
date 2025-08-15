import { useQuery } from "@tanstack/react-query";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { useBusinessId } from "@/hooks/useBusinessId";
import { useAuth } from "@clerk/clerk-react";

export interface Quote {
  id: string;
  number: string;
  total: number;
  status: "Draft" | "Sent" | "Approved" | "Declined" | "Expired";
  updatedAt: string;
  viewCount: number;
  publicToken: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
}

interface UseQuotesDataOptions {
  enabled?: boolean;
}

/**
 * Simplified quotes hook - single query for both count and data
 */
export function useQuotesData(opts?: UseQuotesDataOptions) {
  const { isSignedIn } = useAuth();
  const businessId = useBusinessId();
  const enabled = isSignedIn && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.quotes(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useQuotesData] fetching quotes...");
      const data = await edgeRequest(fn('quotes'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useQuotesData] no data - likely signed out");
        return { quotes: [], count: 0 };
      }
      
      const quotes: Quote[] = (data.rows || []).map((row: any) => ({
        id: row.id,
        number: row.number,
        total: row.total,
        status: row.status,
        updatedAt: row.updatedAt || row.updated_at,
        publicToken: row.publicToken || row.public_token,
        viewCount: row.viewCount ?? row.view_count ?? 0,
        customerId: row.customerId || row.customer_id,
        customerName: row.customerName ?? row.customers?.name,
        customerEmail: row.customerEmail ?? row.customers?.email,
      }));
      
      const count = data.count ?? quotes.length;
      console.info("[useQuotesData] fetched", quotes.length, "quotes");
      
      return { quotes, count };
    },
    staleTime: 30_000,
  });

  return {
    data: query.data?.quotes ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
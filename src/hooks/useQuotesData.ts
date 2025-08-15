import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { z } from "zod";

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

const QuotesResponseSchema = z.object({
  rows: z.array(z.any()).optional().default([]),
  count: z.number().optional(),
});

interface UseQuotesDataOptions {
  enabled?: boolean;
  loadData?: boolean;
}

/**
 * Unified quotes hook that provides both count and data
 */
export function useQuotesData(opts?: UseQuotesDataOptions) {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && (opts?.enabled ?? true);
  const loadData = opts?.loadData ?? true;

  // Count query
  const countQuery = useQuery({
    queryKey: queryKeys.counts.quotes(businessId || ''),
    enabled: enabled && !!businessId,
    queryFn: async (): Promise<number> => {
      console.info("[useQuotesData] fetching count...");
      const data = await edgeRequest(`${fn('quotes')}?count=true`, {
        method: 'GET',
      });
      
      const count = data?.count ?? 0;
      console.info("[useQuotesData] count:", count);
      return count;
    },
    staleTime: 30_000,
  });

  // Full data query
  const dataQuery = useQuery<Quote[]>({
    queryKey: queryKeys.data.quotes(businessId || ''),
    enabled: enabled && !!businessId && loadData,
    queryFn: async () => {
      console.info("[useQuotesData] fetching full data...");
      const data = await edgeRequest(fn('quotes'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useQuotesData] no data (null) – likely signed out");
        return [];
      }
      
      const parsed = QuotesResponseSchema.parse(data);
      const quotes: Quote[] = (parsed.rows || []).map((row: any) => ({
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
      
      console.info("[useQuotesData] fetched", quotes.length, "quotes");
      return quotes;
    },
    staleTime: 30_000,
  });

  return {
    count: countQuery.data ?? 0,
    isLoadingCount: countQuery.isLoading,
    isErrorCount: countQuery.isError,
    errorCount: countQuery.error,
    
    data: dataQuery.data ?? [],
    isLoadingData: dataQuery.isLoading,
    isErrorData: dataQuery.isError,
    errorData: dataQuery.error,
    
    isLoading: countQuery.isLoading || (loadData && dataQuery.isLoading),
    isError: countQuery.isError || (loadData && dataQuery.isError),
    error: countQuery.error || (loadData && dataQuery.error),
    
    refetchCount: countQuery.refetch,
    refetchData: dataQuery.refetch,
    refetch: () => {
      countQuery.refetch();
      if (loadData) dataQuery.refetch();
    },
  };
}
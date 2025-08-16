import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";

import type { QuoteListItem } from '@/types';

interface UseQuotesDataOptions {
  enabled?: boolean;
}

/**
 * Direct Supabase quotes hook - no Edge Function needed
 */
export function useQuotesData(opts?: UseQuotesDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.quotes(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useQuotesData] fetching quotes...");
      
      const { data, error, count } = await supabase
        .from('quotes')
        .select(`
          *,
          customers!inner(name, email)
        `, { count: 'exact' })
        .eq('business_id', businessId!)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error("[useQuotesData] error:", error);
        throw error;
      }
      
      const quotes: QuoteListItem[] = (data || []).map((row: any) => ({
        id: row.id,
        number: row.number,
        total: row.total,
        status: row.status,
        updatedAt: row.updated_at,
        publicToken: row.public_token,
        viewCount: row.view_count ?? 0,
        customerId: row.customer_id,
        customerName: row.customers?.name,
        customerEmail: row.customers?.email,
      }));
      
      console.info("[useQuotesData] fetched", quotes.length, "quotes");
      
      return { quotes, count: count ?? quotes.length };
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
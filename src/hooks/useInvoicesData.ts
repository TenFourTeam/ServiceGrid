import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  jobId?: string | null;
  subtotal: number;
  total: number;
  taxRate: number;
  discount: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  dueAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  publicToken?: string;
}

interface UseInvoicesDataOptions {
  enabled?: boolean;
}

/**
 * Direct Supabase invoices hook - no Edge Function needed
 */
export function useInvoicesData(opts?: UseInvoicesDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.invoices(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useInvoicesData] fetching invoices...");
      
      const { data, error, count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId!)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error("[useInvoicesData] error:", error);
        throw error;
      }
      
      const invoices: Invoice[] = (data || []).map((row: any) => ({
        id: row.id,
        number: row.number,
        customerId: row.customer_id,
        jobId: row.job_id ?? null,
        subtotal: row.subtotal,
        total: row.total,
        taxRate: row.tax_rate ?? 0,
        discount: row.discount ?? 0,
        status: row.status,
        dueAt: row.due_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        publicToken: row.public_token,
      }));
      
      console.info("[useInvoicesData] fetched", invoices.length, "invoices");
      
      return { invoices, count: count ?? invoices.length };
    },
    staleTime: 30_000,
  });

  return {
    data: query.data?.invoices ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
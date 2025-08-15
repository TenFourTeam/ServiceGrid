import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { z } from "zod";

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

const InvoicesResponseSchema = z.object({
  rows: z.array(z.any()).optional().default([]),
  count: z.number().optional(),
});

interface UseInvoicesDataOptions {
  enabled?: boolean;
  loadData?: boolean;
}

/**
 * Unified invoices hook that provides both count and data
 */
export function useInvoicesData(opts?: UseInvoicesDataOptions) {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && (opts?.enabled ?? true);
  const loadData = opts?.loadData ?? true;

  // Count query
  const countQuery = useQuery({
    queryKey: queryKeys.counts.invoices(businessId || ''),
    enabled: enabled && !!businessId,
    queryFn: async (): Promise<number> => {
      console.info("[useInvoicesData] fetching count...");
      const data = await edgeRequest(`${fn('invoices')}?count=true`, {
        method: 'GET',
      });
      
      const count = data?.count ?? 0;
      console.info("[useInvoicesData] count:", count);
      return count;
    },
    staleTime: 30_000,
  });

  // Full data query
  const dataQuery = useQuery<Invoice[]>({
    queryKey: queryKeys.data.invoices(businessId || ''),
    enabled: enabled && !!businessId && loadData,
    queryFn: async () => {
      console.info("[useInvoicesData] fetching full data...");
      const data = await edgeRequest(fn('invoices'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useInvoicesData] no data (null) – likely signed out");
        return [];
      }
      
      const parsed = InvoicesResponseSchema.parse(data);
      const invoices: Invoice[] = (parsed.rows || []).map((row: any) => ({
        id: row.id,
        number: row.number,
        customerId: row.customerId || row.customer_id,
        jobId: row.jobId ?? row.job_id ?? null,
        subtotal: row.subtotal,
        total: row.total,
        taxRate: row.taxRate ?? row.tax_rate ?? 0,
        discount: row.discount ?? 0,
        status: row.status,
        dueAt: row.dueAt || row.due_at,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        publicToken: row.publicToken || row.public_token,
      }));
      
      console.info("[useInvoicesData] fetched", invoices.length, "invoices");
      return invoices;
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
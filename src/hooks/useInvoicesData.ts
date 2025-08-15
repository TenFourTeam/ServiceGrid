import { useQuery } from "@tanstack/react-query";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { useBusinessId } from "@/hooks/useBusinessId";
import { useAuth } from "@clerk/clerk-react";

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
 * Simplified invoices hook - single query for both count and data
 */
export function useInvoicesData(opts?: UseInvoicesDataOptions) {
  const { isSignedIn } = useAuth();
  const businessId = useBusinessId();
  const enabled = isSignedIn && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.invoices(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useInvoicesData] fetching invoices...");
      const data = await edgeRequest(fn('invoices'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useInvoicesData] no data - likely signed out");
        return { invoices: [], count: 0 };
      }
      
      const invoices: Invoice[] = (data.rows || []).map((row: any) => ({
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
      
      const count = data.count ?? invoices.length;
      console.info("[useInvoicesData] fetched", invoices.length, "invoices");
      
      return { invoices, count };
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
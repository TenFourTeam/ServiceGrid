
import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/auth";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { qk } from "@/queries/keys";
import { z } from "zod";

export interface DbInvoiceRow {
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
});

export function useSupabaseInvoices(opts?: { enabled?: boolean }) {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && (opts?.enabled ?? true);

  return useQuery<{ rows: DbInvoiceRow[] } | null, Error>({
    queryKey: qk.invoicesList(businessId || ''),
    enabled: enabled && !!businessId,
    queryFn: async () => {
      console.info("[useSupabaseInvoices] fetching...");
      const data = await edgeRequest(fn('invoices'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useSupabaseInvoices] no data (null) – likely signed out");
        return { rows: [] };
      }
      const parsed = InvoicesResponseSchema.parse(data);
      const rows: DbInvoiceRow[] = (parsed.rows || []).map((row: any) => ({
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
      console.info("[useSupabaseInvoices] fetched", rows.length, "rows");
      return { rows };
    },
    staleTime: 30_000,
  });
}

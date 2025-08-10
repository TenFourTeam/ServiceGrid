import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { getClerkTokenStrict } from "@/utils/clerkToken";

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

export function useSupabaseInvoices(opts?: { enabled?: boolean }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<{ rows: DbInvoiceRow[] } | null, Error>({
    queryKey: ["supabase", "invoices"],
    enabled,
    queryFn: async () => {
      const token = await getClerkTokenStrict(getToken);
      const r = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/invoices`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`Failed to load invoices (${r.status}): ${txt}`);
      }
      const data = await r.json();
      const rows: DbInvoiceRow[] = (data?.rows || []).map((row: any) => ({
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
      return { rows };
    },
    staleTime: 30_000,
  });
}

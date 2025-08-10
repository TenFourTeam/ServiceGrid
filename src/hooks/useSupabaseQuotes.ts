import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import type { Tables } from "@/integrations/supabase/types";


export interface DbQuoteRow {
  id: string;
  number: string;
  total: number;
  status: Tables<"quotes">["status"];
  updatedAt: string;
  viewCount: number;
  publicToken: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
}

export function useSupabaseQuotes(opts?: { enabled?: boolean }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<{ rows: DbQuoteRow[] } | null, Error>({
    queryKey: ["supabase", "quotes"],
    enabled,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const r = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`Failed to load quotes (${r.status}): ${txt}`);
      }

      const data = await r.json();
      const rows: DbQuoteRow[] = (data?.rows || []).map((row: any) => ({
        id: row.id,
        number: row.number,
        total: row.total,
        status: row.status as Tables<"quotes">["status"],
        updatedAt: row.updatedAt || row.updated_at,
        publicToken: row.publicToken || row.public_token,
        viewCount: row.viewCount ?? row.view_count ?? 0,
        customerId: row.customerId || row.customer_id,
        customerName: row.customerName ?? row.customers?.name,
        customerEmail: row.customerEmail ?? row.customers?.email,
      }));
      return { rows };
    },
    staleTime: 30_000,
  });
}

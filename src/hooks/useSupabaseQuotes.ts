import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const enabled = (opts?.enabled ?? true);

  return useQuery<{ rows: DbQuoteRow[] } | null, Error>({
    queryKey: ["supabase", "quotes"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(
          [
            "id",
            "number",
            "total",
            "status",
            "updated_at",
            "public_token",
            "view_count",
            "customer_id",
            "customers(name,email)",
          ].join(",")
        )
        .order("updated_at", { ascending: false });

      if (error) throw error;
      const rows: DbQuoteRow[] = (data || []).map((r: any) => ({
        id: r.id,
        number: r.number,
        total: r.total,
        status: r.status,
        updatedAt: r.updated_at,
        publicToken: r.public_token,
        viewCount: r.view_count ?? 0,
        customerId: r.customer_id,
        customerName: r.customers?.name,
        customerEmail: r.customers?.email,
      }));
      return { rows };
    },
    staleTime: 30_000,
  });
}

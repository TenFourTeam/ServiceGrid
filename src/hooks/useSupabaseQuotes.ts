
import { useQuery } from "@tanstack/react-query";
import { useAuthSnapshot } from "@/auth";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { qk } from "@/queries/keys";
import type { Tables } from "@/integrations/supabase/types";
import { z } from "zod";

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

const QuotesResponseSchema = z.object({
  rows: z.array(z.any()).optional().default([]),
});

export function useSupabaseQuotes(opts?: { enabled?: boolean }) {
  const { snapshot } = useAuthSnapshot();
  const enabled = snapshot.phase === 'authenticated' && (opts?.enabled ?? true);

  return useQuery<{ rows: DbQuoteRow[] } | null, Error>({
    queryKey: qk.quotesList(snapshot.businessId || ''),
    enabled: enabled && !!snapshot.businessId,
    queryFn: async () => {
      console.info("[useSupabaseQuotes] fetching...");
      const data = await edgeRequest(fn('quotes'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useSupabaseQuotes] no data (null) – likely signed out");
        return { rows: [] };
      }
      const parsed = QuotesResponseSchema.parse(data);
      const rows: DbQuoteRow[] = (parsed.rows || []).map((row: any) => ({
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
      console.info("[useSupabaseQuotes] fetched", rows.length, "rows");
      return { rows };
    },
    staleTime: 30_000,
  });
}

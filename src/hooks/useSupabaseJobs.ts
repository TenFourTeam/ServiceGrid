
import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { z } from "zod";

export interface DbJobRow {
  id: string;
  customerId: string;
  quoteId?: string | null;
  address?: string | null;
  title?: string | null;
  startsAt: string;
  endsAt: string;
  status: "Scheduled" | "In Progress" | "Completed";
  total?: number | null;
  notes?: string | null;
  photos?: string[];
  createdAt?: string;
  updatedAt?: string;
}

const JobsResponseSchema = z.object({
  rows: z.array(z.any()).optional().default([]),
});

export function useSupabaseJobs(opts?: { enabled?: boolean; refetchInterval?: number | false; refetchOnWindowFocus?: boolean; refetchOnReconnect?: boolean }) {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && (opts?.enabled ?? true);

  return useQuery<{ rows: DbJobRow[] } | null, Error>({
    queryKey: queryKeys.data.jobs(businessId || ''),
    enabled: enabled && !!businessId,
    refetchInterval: opts?.refetchInterval ?? false,
    refetchOnWindowFocus: opts?.refetchOnWindowFocus ?? true,
    refetchOnReconnect: opts?.refetchOnReconnect ?? true,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      console.info("[useSupabaseJobs] fetching...");
      const data = await edgeRequest(fn('jobs'), {
        method: 'GET',
      });

      if (!data) {
        console.info("[useSupabaseJobs] no data (null) – likely signed out");
        return { rows: [] };
      }

      const parsed = JobsResponseSchema.parse(data);

      const rows: DbJobRow[] = (parsed.rows || []).map((row: any) => ({
        id: row.id,
        customerId: row.customerId || row.customer_id,
        quoteId: row.quoteId ?? row.quote_id ?? null,
        address: row.address ?? null,
        title: row.title ?? null,
        startsAt: row.startsAt || row.starts_at,
        endsAt: row.endsAt || row.ends_at,
        status: row.status,
        total: row.total ?? null,
        notes: row.notes ?? null,
        photos: Array.isArray(row.photos) ? row.photos : [],
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
      }));
      console.info("[useSupabaseJobs] fetched", rows.length, "rows");
      return { rows };
    },
    staleTime: 30_000,
  });
}

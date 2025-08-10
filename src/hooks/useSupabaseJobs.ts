import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";
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

export function useSupabaseJobs(opts?: { enabled?: boolean; refetchInterval?: number | false; refetchOnWindowFocus?: boolean; refetchOnReconnect?: boolean }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<{ rows: DbJobRow[] } | null, Error>({
    queryKey: ["supabase", "jobs"],
    enabled,
    refetchInterval: opts?.refetchInterval ?? false,
    refetchOnWindowFocus: opts?.refetchOnWindowFocus ?? true,
    refetchOnReconnect: opts?.refetchOnReconnect ?? true,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const data = await edgeFetchJson("jobs", getToken);

      const rows: DbJobRow[] = (data?.rows || []).map((row: any) => ({
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
      return { rows };
    },
    staleTime: 30_000,
  });
}

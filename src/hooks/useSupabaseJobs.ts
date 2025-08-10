import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { getClerkTokenStrict } from "@/utils/clerkToken";

export interface DbJobRow {
  id: string;
  customerId: string;
  quoteId?: string | null;
  address?: string | null;
  startsAt: string;
  endsAt: string;
  status: "Scheduled" | "In Progress" | "Completed";
  total?: number | null;
  notes?: string | null;
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
      const token = await getClerkTokenStrict(getToken);
      const r = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/jobs`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`Failed to load jobs (${r.status}): ${txt}`);
      }
      const data = await r.json();
      const rows: DbJobRow[] = (data?.rows || []).map((row: any) => ({
        id: row.id,
        customerId: row.customerId || row.customer_id,
        quoteId: row.quoteId ?? row.quote_id ?? null,
        address: row.address ?? null,
        startsAt: row.startsAt || row.starts_at,
        endsAt: row.endsAt || row.ends_at,
        status: row.status,
        total: row.total ?? null,
        notes: row.notes ?? null,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
      }));
      return { rows };
    },
    staleTime: 30_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { getClerkTokenStrict } from "@/utils/clerkToken";
import type { DbJobRow } from "@/hooks/useSupabaseJobs";

export function useSupabaseJobsRange(
  range: { start: Date; end: Date },
  opts?: { enabled?: boolean }
) {
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<{ rows: DbJobRow[] } | null, Error>({
    queryKey: [
      "supabase",
      "jobs",
      "range",
      range.start.toISOString(),
      range.end.toISOString(),
    ],
    enabled,
    queryFn: async () => {
      const token = await getClerkTokenStrict(getToken);
      const params = new URLSearchParams({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
      const r = await fetch(
        `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/jobs?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
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

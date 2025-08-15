import { useQuery } from "@tanstack/react-query";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Job } from "@/types";

interface UseJobsDataOptions {
  enabled?: boolean;
}

/**
 * Simplified jobs hook - single query for both count and data
 */
export function useJobsData(opts?: UseJobsDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.jobs(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useJobsData] fetching jobs...");
      const data = await edgeRequest(fn('jobs'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useJobsData] no data - likely signed out");
        return { jobs: [], count: 0 };
      }
      
      const jobs: Job[] = (data.rows || []).map((row: any) => ({
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
      
      const count = data.count ?? jobs.length;
      console.info("[useJobsData] fetched", jobs.length, "jobs");
      
      return { jobs, count };
    },
    staleTime: 30_000,
  });

  return {
    data: query.data?.jobs ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
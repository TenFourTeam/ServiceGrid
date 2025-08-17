import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Job } from "@/types";

interface UseJobsDataOptions {
  enabled?: boolean;
}

/**
 * Direct Supabase jobs hook - no Edge Function needed
 */
export function useJobsData(opts?: UseJobsDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.jobs(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useJobsData] fetching jobs...");
      
      const { data, error, count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId!)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error("[useJobsData] error:", error);
        throw error;
      }
      
      const jobs: Job[] = (data || []).map((row: any) => ({
        id: row.id,
        businessId: row.business_id,
        customerId: row.customer_id,
        quoteId: row.quote_id ?? null,
        address: row.address ?? null,
        title: row.title ?? null,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        total: row.total ?? null,
        notes: row.notes ?? null,
        photos: Array.isArray(row.photos) ? row.photos : [],
        jobType: row.job_type || 'scheduled',
        clockInTime: row.clock_in_time,
        clockOutTime: row.clock_out_time,
        isClockedIn: row.is_clocked_in || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      
      console.info("[useJobsData] fetched", jobs.length, "jobs");
      
      return { jobs, count: count ?? jobs.length };
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from './useBusinessContext';

export interface GeneratedJobStats {
  totalGenerated: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  completionRate: number;
  avgDurationMinutes: number | null;
  totalRevenue: number;
  nextScheduledJob: any | null;
  recentJobs: any[];
}

/**
 * Hook to fetch and analyze jobs generated from a specific recurring template
 */
export function useGeneratedJobsFromTemplate(templateId?: string) {
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['generated-jobs-from-template', templateId, businessId],
    queryFn: async () => {
      if (!templateId || !businessId) {
        throw new Error('Template ID and Business ID are required');
      }

      // Fetch all jobs generated from this template
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(name, email, phone),
          assignments:job_assignments(
            user:profiles(full_name, email)
          )
        `)
        .eq('recurring_template_id', templateId)
        .eq('business_id', businessId)
        .order('starts_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const stats: GeneratedJobStats = {
        totalGenerated: jobs?.length || 0,
        completed: jobs?.filter(j => j.status === 'Completed').length || 0,
        scheduled: jobs?.filter(j => j.status === 'Scheduled').length || 0,
        cancelled: jobs?.filter(j => j.status !== 'Completed' && j.status !== 'Scheduled' && j.status !== 'In Progress').length || 0,
        completionRate: 0,
        avgDurationMinutes: null,
        totalRevenue: 0,
        nextScheduledJob: null,
        recentJobs: jobs?.slice(0, 5) || [],
      };

      if (stats.totalGenerated > 0) {
        stats.completionRate = Math.round((stats.completed / stats.totalGenerated) * 100);
      }

      // Calculate average duration for completed jobs
      const completedJobs = jobs?.filter(j => 
        j.status === 'Completed' && 
        j.clock_in_time && 
        j.clock_out_time
      );

      if (completedJobs && completedJobs.length > 0) {
        const totalMinutes = completedJobs.reduce((sum, job) => {
          const start = new Date(job.clock_in_time).getTime();
          const end = new Date(job.clock_out_time).getTime();
          return sum + (end - start) / (1000 * 60);
        }, 0);
        stats.avgDurationMinutes = Math.round(totalMinutes / completedJobs.length);
      }

      // Calculate total revenue from completed jobs
      stats.totalRevenue = jobs
        ?.filter(j => j.status === 'Completed' && j.total)
        .reduce((sum, j) => sum + (j.total || 0), 0) || 0;

      // Find next scheduled job
      const futureJobs = jobs
        ?.filter(j => j.status === 'Scheduled' && j.starts_at)
        .filter(j => new Date(j.starts_at) > new Date())
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

      stats.nextScheduledJob = futureJobs?.[0] || null;

      return stats;
    },
    enabled: !!templateId && !!businessId,
    staleTime: 60 * 1000, // 1 minute
  });
}

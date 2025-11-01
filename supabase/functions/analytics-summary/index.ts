import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface AnalyticsSummaryRequest {
  businessId: string;
  startDate: string;
  endDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessId, startDate, endDate }: AnalyticsSummaryRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch jobs data
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (jobsError) throw jobsError;

    // Calculate overview metrics
    const totalJobs = jobs?.length || 0;
    const completedJobs = jobs?.filter(j => j.status === 'Completed').length || 0;
    const onTimeJobs = jobs?.filter(j => {
      if (j.status !== 'Completed' || !j.ends_at || !j.clock_out_time) return false;
      const scheduled = new Date(j.ends_at);
      const actual = new Date(j.clock_out_time);
      return actual <= scheduled;
    }).length || 0;

    const onTimeCompletionRate = completedJobs > 0 ? (onTimeJobs / completedJobs) * 100 : 0;

    // Calculate average travel time (if available from jobs)
    const jobsWithTravel = jobs?.filter(j => j.starts_at && j.clock_in_time) || [];
    const totalTravelMinutes = jobsWithTravel.reduce((sum, j) => {
      const scheduled = new Date(j.starts_at!);
      const actual = new Date(j.clock_in_time!);
      const diff = (actual.getTime() - scheduled.getTime()) / 60000; // minutes
      return sum + Math.max(0, diff); // Only count positive differences
    }, 0);
    const averageTravelTime = jobsWithTravel.length > 0 ? totalTravelMinutes / jobsWithTravel.length : 0;

    // Calculate efficiency score
    const scheduleDensity = totalJobs > 0 ? Math.min(1, totalJobs / 30) : 0; // Based on 30 days
    const travelEfficiency = averageTravelTime > 0 ? Math.max(0, 1 - (averageTravelTime / 60)) : 1;
    const efficiencyScore = (
      (onTimeCompletionRate / 100) * 0.4 +
      travelEfficiency * 0.3 +
      scheduleDensity * 0.3
    ) * 100;

    // Calculate weekly trends
    const weeklyMap = new Map<string, { jobCount: number; travelTime: number; efficiency: number }>();
    
    jobs?.forEach(job => {
      const jobDate = new Date(job.created_at);
      const weekStart = new Date(jobDate);
      weekStart.setDate(jobDate.getDate() - jobDate.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { jobCount: 0, travelTime: 0, efficiency: 0 });
      }

      const week = weeklyMap.get(weekKey)!;
      week.jobCount++;
      
      // Add travel time if available
      if (job.starts_at && job.clock_in_time) {
        const scheduled = new Date(job.starts_at);
        const actual = new Date(job.clock_in_time);
        const diff = (actual.getTime() - scheduled.getTime()) / 60000;
        week.travelTime += Math.max(0, diff);
      }
    });

    const weeklyTrends = Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      jobCount: data.jobCount,
      travelTime: data.jobCount > 0 ? data.travelTime / data.jobCount : 0,
      efficiencyScore: data.jobCount > 0 ? 
        (data.jobCount / 7) * 100 : 0 // Simple efficiency based on jobs per day
    }));

    // Calculate AI suggestions metrics
    const aiJobs = jobs?.filter(j => j.ai_suggested) || [];
    const totalSuggestions = aiJobs.length;
    const accepted = aiJobs.filter(j => j.ai_suggestion_accepted === true).length;
    const rejected = aiJobs.filter(j => j.ai_suggestion_accepted === false).length;
    const acceptanceRate = totalSuggestions > 0 ? (accepted / totalSuggestions) * 100 : 0;

    // Get top rejection reasons
    const rejectionReasons = new Map<string, number>();
    aiJobs.forEach(j => {
      if (j.ai_suggestion_accepted === false && j.ai_suggestion_rejected_reason) {
        const reason = j.ai_suggestion_rejected_reason;
        rejectionReasons.set(reason, (rejectionReasons.get(reason) || 0) + 1);
      }
    });

    const topRejectionReasons = Array.from(rejectionReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const response = {
      overview: {
        totalJobs,
        completedJobs,
        onTimeCompletionRate: Math.round(onTimeCompletionRate * 10) / 10,
        averageTravelTime: Math.round(averageTravelTime * 10) / 10,
        efficiencyScore: Math.round(efficiencyScore * 10) / 10,
      },
      weeklyTrends: weeklyTrends.sort((a, b) => a.week.localeCompare(b.week)),
      aiSuggestions: {
        totalSuggestions,
        accepted,
        rejected,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        topRejectionReasons,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-summary:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface TeamUtilizationRequest {
  businessId: string;
  startDate: string;
  endDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessId, startDate, endDate }: TeamUtilizationRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get business members
    const { data: permissions, error: permError } = await supabase
      .from('business_permissions')
      .select('user_id, profiles(full_name)')
      .eq('business_id', businessId);

    if (permError) throw permError;

    const members = permissions || [];

    // Get timesheet entries for date range
    const { data: entries, error: entriesError } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('business_id', businessId)
      .gte('clock_in_time', start.toISOString())
      .lte('clock_in_time', end.toISOString());

    if (entriesError) throw entriesError;

    // Get job assignments for date range
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id,
        status,
        starts_at,
        ends_at,
        job_assignments(user_id)
      `)
      .eq('business_id', businessId)
      .gte('starts_at', start.toISOString())
      .lte('starts_at', end.toISOString());

    if (jobsError) throw jobsError;

    // Calculate utilization per member
    const memberStats = members.map(member => {
      const userId = member.user_id;
      const userName = (member.profiles as any)?.full_name || 'Unknown';

      // Calculate hours worked from timesheet
      const memberEntries = entries?.filter(e => e.user_id === userId) || [];
      const hoursWorked = memberEntries.reduce((sum, entry) => {
        if (!entry.clock_out_time) return sum;
        const clockIn = new Date(entry.clock_in_time);
        const clockOut = new Date(entry.clock_out_time);
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);

      // Calculate jobs completed
      const memberJobs = jobs?.filter(j => 
        j.job_assignments?.some((a: any) => a.user_id === userId)
      ) || [];
      const jobsCompleted = memberJobs.filter(j => j.status === 'Completed').length;

      // Calculate average job duration
      const completedJobsDurations = memberJobs
        .filter(j => j.status === 'Completed' && j.starts_at && j.ends_at)
        .map(j => {
          const start = new Date(j.starts_at!);
          const end = new Date(j.ends_at!);
          return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        });

      const averageJobDuration = completedJobsDurations.length > 0
        ? completedJobsDurations.reduce((a, b) => a + b, 0) / completedJobsDurations.length
        : 0;

      // Calculate available hours (8 hours per business day in range)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const businessDays = daysDiff * (5 / 7); // Approximate business days
      const hoursAvailable = businessDays * 8;

      // Calculate utilization rate
      const utilizationRate = hoursAvailable > 0 
        ? Math.min(100, (hoursWorked / hoursAvailable) * 100)
        : 0;

      return {
        userId,
        name: userName,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        hoursAvailable: Math.round(hoursAvailable * 10) / 10,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        jobsCompleted,
        averageJobDuration: Math.round(averageJobDuration * 10) / 10,
      };
    });

    return new Response(JSON.stringify({ members: memberStats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in team-utilization:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';
import { requireCtx } from '../_lib/auth.ts';

interface CapacityCheck {
  date: string;
  hasCapacity: boolean;
  currentJobCount: number;
  maxJobsPerDay?: number;
  currentHours: number;
  maxHoursPerDay?: number;
  availableMembers: number;
  warnings: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate using session token
    const { userId, businessId: contextBusinessId, supaAdmin } = await requireCtx(req, { autoCreate: false });

    const { businessId: requestBusinessId, startDate, endDate } = await req.json();
    const businessId = requestBusinessId || contextBusinessId;

    if (!businessId || !startDate || !endDate) {
      throw new Error('businessId, startDate, and endDate are required');
    }

    console.log(`[check-scheduling-capacity] Checking capacity for ${businessId} from ${startDate} to ${endDate}`);

    // Fetch business constraints
    const { data: constraints } = await supaAdmin
      .from('business_constraints')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);

    const maxJobsPerDay = constraints?.find(c => c.constraint_type === 'max_jobs_per_day')?.constraint_value?.max;
    const maxHoursPerDay = constraints?.find(c => c.constraint_type === 'max_hours_per_day')?.constraint_value?.max;

    // Fetch jobs in date range
    const { data: jobs } = await supaAdmin
      .from('jobs')
      .select('id, starts_at, ends_at')
      .eq('business_id', businessId)
      .gte('starts_at', startDate)
      .lte('starts_at', endDate)
      .neq('status', 'Completed');

    // Fetch team members
    const { data: members } = await supaAdmin
      .from('invites')
      .select('invited_user_id')
      .eq('business_id', businessId)
      .not('accepted_at', 'is', null)
      .is('revoked_at', null);

    const totalMembers = (members?.length || 0) + 1; // +1 for owner

    // Group jobs by date
    const jobsByDate = new Map<string, any[]>();
    jobs?.forEach(job => {
      const date = new Date(job.starts_at).toISOString().split('T')[0];
      if (!jobsByDate.has(date)) {
        jobsByDate.set(date, []);
      }
      jobsByDate.get(date)!.push(job);
    });

    // Check capacity for each date
    const capacityChecks: CapacityCheck[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayJobs = jobsByDate.get(dateStr) || [];
      
      const totalHours = dayJobs.reduce((sum, job) => {
        const start = new Date(job.starts_at);
        const end = new Date(job.ends_at);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      const warnings: string[] = [];
      let hasCapacity = true;

      if (maxJobsPerDay && dayJobs.length >= maxJobsPerDay) {
        warnings.push(`Maximum jobs per day (${maxJobsPerDay}) reached`);
        hasCapacity = false;
      }

      if (maxHoursPerDay && totalHours >= maxHoursPerDay) {
        warnings.push(`Maximum hours per day (${maxHoursPerDay}) reached`);
        hasCapacity = false;
      }

      if (dayJobs.length >= totalMembers * 3) {
        warnings.push('Team capacity may be stretched');
      }

      capacityChecks.push({
        date: dateStr,
        hasCapacity,
        currentJobCount: dayJobs.length,
        maxJobsPerDay,
        currentHours: Math.round(totalHours * 10) / 10,
        maxHoursPerDay,
        availableMembers: totalMembers,
        warnings,
      });
    }

    console.log(`[check-scheduling-capacity] Checked ${capacityChecks.length} days`);

    return new Response(
      JSON.stringify({ 
        data: capacityChecks,
        summary: {
          totalDays: capacityChecks.length,
          daysAtCapacity: capacityChecks.filter(c => !c.hasCapacity).length,
          daysWithWarnings: capacityChecks.filter(c => c.warnings.length > 0).length,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[check-scheduling-capacity] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

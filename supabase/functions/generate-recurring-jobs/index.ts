import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface RecurrenceConfig {
  daysOfWeek?: number[]; // 0-6 for weekly/biweekly
  dayOfMonth?: number; // 1-31 for monthly
  interval?: number; // for custom patterns
}

function calculateNextOccurrences(
  pattern: string,
  config: RecurrenceConfig,
  startDate: Date,
  endDate: Date | null,
  count: number
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);
  const maxDate = endDate ? new Date(endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year max

  while (occurrences.length < count && currentDate <= maxDate) {
    occurrences.push(new Date(currentDate));

    switch (pattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;

      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;

      case 'biweekly':
        currentDate.setDate(currentDate.getDate() + 14);
        break;

      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        if (config.dayOfMonth) {
          currentDate.setDate(Math.min(config.dayOfMonth, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()));
        }
        break;

      case 'custom':
        if (config.interval) {
          currentDate.setDate(currentDate.getDate() + config.interval);
        } else {
          currentDate.setDate(currentDate.getDate() + 7); // default to weekly
        }
        break;
    }
  }

  return occurrences;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[generate-recurring-jobs] Auth error:', authError);
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const { templateId, count = 4, startFromDate } = await req.json();

    if (!templateId) {
      throw new Error('templateId is required');
    }

    console.log(`[generate-recurring-jobs] Generating ${count} jobs for template ${templateId}`);

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('recurring_job_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    if (!template.is_active) {
      throw new Error('Template is not active');
    }

    // Calculate occurrences
    const startDate = startFromDate ? new Date(startFromDate) : new Date(template.next_generation_date || template.start_date);
    const occurrences = calculateNextOccurrences(
      template.recurrence_pattern,
      template.recurrence_config as RecurrenceConfig,
      startDate,
      template.end_date ? new Date(template.end_date) : null,
      count
    );

    console.log(`[generate-recurring-jobs] Calculated ${occurrences.length} occurrences`);

    // Create jobs for each occurrence
    const jobsToCreate = occurrences.map((date, index) => {
      const startTime = template.preferred_time_window?.start || '09:00';
      const [hours, minutes] = startTime.split(':').map(Number);
      
      const startsAt = new Date(date);
      startsAt.setHours(hours, minutes, 0, 0);
      
      const endsAt = new Date(startsAt);
      endsAt.setMinutes(endsAt.getMinutes() + template.estimated_duration_minutes);

      return {
        business_id: template.business_id,
        customer_id: template.customer_id,
        title: template.title,
        address: template.address,
        notes: template.notes,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'Scheduled',
        recurring_template_id: template.id,
        estimated_duration_minutes: template.estimated_duration_minutes,
        owner_id: profile.id,
      };
    });

    const { data: createdJobs, error: jobsError } = await supabase
      .from('jobs')
      .insert(jobsToCreate)
      .select();

    if (jobsError) {
      console.error('[generate-recurring-jobs] Error creating jobs:', jobsError);
      throw jobsError;
    }

    // Assign team members if specified
    if (template.assigned_members && Array.isArray(template.assigned_members) && template.assigned_members.length > 0) {
      const assignments = createdJobs.flatMap(job =>
        template.assigned_members.map((userId: string) => ({
          job_id: job.id,
          user_id: userId,
          assigned_by: profile.id,
        }))
      );

      if (assignments.length > 0) {
        await supabase.from('job_assignments').insert(assignments);
      }
    }

    // Update template with last generation info
    const lastOccurrence = occurrences[occurrences.length - 1];
    const nextDate = new Date(lastOccurrence);
    
    switch (template.recurrence_pattern) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'custom':
        const interval = (template.recurrence_config as RecurrenceConfig).interval || 7;
        nextDate.setDate(nextDate.getDate() + interval);
        break;
    }

    await supabase
      .from('recurring_job_templates')
      .update({
        last_generated_at: new Date().toISOString(),
        next_generation_date: nextDate.toISOString().split('T')[0],
      })
      .eq('id', templateId);

    console.log(`[generate-recurring-jobs] Successfully created ${createdJobs.length} jobs`);

    return new Response(
      JSON.stringify({ 
        data: createdJobs,
        count: createdJobs.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[generate-recurring-jobs] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

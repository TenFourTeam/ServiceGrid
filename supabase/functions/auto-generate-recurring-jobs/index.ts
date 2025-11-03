import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RecurrenceConfig {
  daysOfWeek?: number[];
  dayOfMonth?: number;
  interval?: number;
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
  const maxDate = endDate ? new Date(endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

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
          currentDate.setDate(currentDate.getDate() + 7);
        }
        break;
    }
  }

  return occurrences;
}

Deno.serve(async (req) => {
  try {
    console.log('[auto-generate-recurring-jobs] Cron job triggered');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active templates with auto_schedule enabled
    const { data: templates, error: templatesError } = await supabase
      .from('recurring_job_templates')
      .select('*')
      .eq('is_active', true)
      .eq('auto_schedule', true);

    if (templatesError) {
      console.error('[auto-generate-recurring-jobs] Error fetching templates:', templatesError);
      throw templatesError;
    }

    if (!templates || templates.length === 0) {
      console.log('[auto-generate-recurring-jobs] No templates to process');
      return new Response(JSON.stringify({ message: 'No templates to process' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[auto-generate-recurring-jobs] Processing ${templates.length} templates`);
    const results = [];

    for (const template of templates) {
      try {
        // Check if we need to generate jobs (next_generation_date is today or in the past)
        const nextGenDate = template.next_generation_date ? new Date(template.next_generation_date) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!nextGenDate || nextGenDate > today) {
          console.log(`[auto-generate-recurring-jobs] Template ${template.id} not due yet`);
          continue;
        }

        // Calculate next 4 occurrences
        const startDate = new Date(template.next_generation_date || template.start_date);
        const occurrences = calculateNextOccurrences(
          template.recurrence_pattern,
          template.recurrence_config as RecurrenceConfig,
          startDate,
          template.end_date ? new Date(template.end_date) : null,
          4
        );

        console.log(`[auto-generate-recurring-jobs] Generating ${occurrences.length} jobs for template ${template.id}`);

        // Create jobs for each occurrence
        const jobsToCreate = occurrences.map((date) => {
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
            owner_id: template.created_by,
          };
        });

        const { data: createdJobs, error: jobsError } = await supabase
          .from('jobs')
          .insert(jobsToCreate)
          .select();

        if (jobsError) {
          console.error(`[auto-generate-recurring-jobs] Error creating jobs for template ${template.id}:`, jobsError);
          results.push({ templateId: template.id, error: jobsError.message });
          continue;
        }

        // Assign team members if specified
        if (template.assigned_members && Array.isArray(template.assigned_members) && template.assigned_members.length > 0) {
          const assignments = createdJobs.flatMap(job =>
            template.assigned_members.map((userId: string) => ({
              job_id: job.id,
              user_id: userId,
              assigned_by: template.created_by,
            }))
          );

          if (assignments.length > 0) {
            await supabase.from('job_assignments').insert(assignments);
          }
        }

        // Update template with new next_generation_date
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
          .eq('id', template.id);

        results.push({ 
          templateId: template.id, 
          jobsCreated: createdJobs.length,
          nextGenerationDate: nextDate.toISOString().split('T')[0]
        });

        console.log(`[auto-generate-recurring-jobs] Successfully created ${createdJobs.length} jobs for template ${template.id}`);
      } catch (error: any) {
        console.error(`[auto-generate-recurring-jobs] Error processing template ${template.id}:`, error);
        results.push({ templateId: template.id, error: error.message });
      }
    }

    console.log('[auto-generate-recurring-jobs] Completed:', results);

    return new Response(JSON.stringify({ 
      message: 'Job generation completed',
      results 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[auto-generate-recurring-jobs] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

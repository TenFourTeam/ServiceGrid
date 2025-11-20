import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('[QB Scheduler] Running scheduled sync check');

    // Find all schedules that are due to run
    const now = new Date();
    const { data: schedules, error } = await supabase
      .from('quickbooks_sync_schedules')
      .select('*')
      .eq('enabled', true)
      .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`);

    if (error) throw error;

    console.log(`[QB Scheduler] Found ${schedules?.length || 0} schedules to process`);

    const results = [];

    for (const schedule of schedules || []) {
      try {
        console.log(`[QB Scheduler] Processing schedule ${schedule.id} for ${schedule.entity_type}`);

        // Determine the edge function to call
        const functionName = `quickbooks-sync-${schedule.entity_type}s`;
        
        // Call the appropriate sync function
        // Note: This would need proper auth setup with service role
        const { data: syncResult, error: syncError } = await supabase.functions.invoke(functionName, {
          body: { direction: schedule.direction }
        });

        if (syncError) {
          console.error(`[QB Scheduler] Sync failed:`, syncError);
          results.push({
            schedule_id: schedule.id,
            status: 'error',
            error: syncError.message,
          });
        } else {
          console.log(`[QB Scheduler] Sync completed:`, syncResult);
          results.push({
            schedule_id: schedule.id,
            status: 'success',
            result: syncResult,
          });
        }

        // Update schedule with next run time
        const nextRunAt = new Date(now.getTime() + schedule.frequency_minutes * 60 * 1000);
        await supabase
          .from('quickbooks_sync_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt.toISOString(),
          })
          .eq('id', schedule.id);

      } catch (scheduleError) {
        console.error(`[QB Scheduler] Error processing schedule ${schedule.id}:`, scheduleError);
        results.push({
          schedule_id: schedule.id,
          status: 'error',
          error: scheduleError.message,
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processedCount: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Scheduler Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

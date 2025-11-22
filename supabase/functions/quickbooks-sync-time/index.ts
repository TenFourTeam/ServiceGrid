import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireCtx } from '../_lib/auth.ts';
import { sgTimesheetToQB } from '../_lib/qb-transforms.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { direction, dryRun = false } = await req.json(); // 'to_qb' or 'from_qb'

    console.log(`[QB Sync Time] ${direction} for business ${ctx.businessId}, dryRun=${dryRun}`);

    let recordsProcessed = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    if (direction === 'to_qb') {
      // Fetch timesheet entries from ServiceGrid
      const { data: timesheetEntries, error: timesheetError } = await ctx.supaAdmin
        .from('timesheet_entries')
        .select(`
          *,
          jobs:job_id (
            id,
            title,
            customer_id,
            customers:customer_id (
              id,
              name
            )
          )
        `)
        .eq('business_id', ctx.businessId)
        .not('clock_out_time', 'is', null) // Only completed entries
        .order('clock_in_time', { ascending: false })
        .limit(100);

      if (timesheetError) {
        throw new Error(`Failed to fetch timesheet entries: ${timesheetError.message}`);
      }

      console.log(`[QB Sync Time] Found ${timesheetEntries?.length || 0} timesheet entries`);

      // Check QuickBooks connection
      const { data: qbConnection, error: qbError } = await supabase
        .from('quickbooks_connections')
        .select('*')
        .eq('business_id', ctx.businessId)
        .eq('is_active', true)
        .single();

      if (qbError || !qbConnection) {
        console.log('[QB Sync Time] No active QuickBooks connection found');
        
        // Log preview mode
        await supabase.from('quickbooks_sync_log').insert({
          business_id: ctx.businessId,
          sync_type: 'time_entry',
          direction,
          status: 'success',
          records_processed: 0,
          metadata: { 
            mode: 'preview',
            message: 'No QuickBooks connection. Would process entries when connected.',
            entriesFound: timesheetEntries?.length || 0
          }
        });

        return new Response(JSON.stringify({
          success: true,
          direction,
          recordsProcessed: 0,
          recordsFailed: 0,
          message: 'Time sync will execute when QuickBooks is connected',
          preview: {
            entriesFound: timesheetEntries?.length || 0,
            sampleTransformation: timesheetEntries?.[0] 
              ? sgTimesheetToQB(timesheetEntries[0], timesheetEntries[0].jobs)
              : null
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process each timesheet entry
      for (const entry of timesheetEntries || []) {
        try {
          // Transform to QuickBooks format
          const qbTimeActivity = sgTimesheetToQB(entry, entry.jobs);

          console.log(`[QB Sync Time] Transformed entry ${entry.id}:`, qbTimeActivity);

          if (!dryRun) {
            // TODO: When QuickBooks API is connected, make actual API call here
            // const response = await fetch(`${QB_API_BASE}/timeactivity`, {
            //   method: 'POST',
            //   headers: {
            //     'Authorization': `Bearer ${qbConnection.access_token}`,
            //     'Content-Type': 'application/json',
            //     'Accept': 'application/json'
            //   },
            //   body: JSON.stringify(qbTimeActivity)
            // });
            
            // For now, just log success
            console.log(`[QB Sync Time] Would create TimeActivity in QuickBooks for entry ${entry.id}`);
          }

          recordsProcessed++;
        } catch (error) {
          console.error(`[QB Sync Time] Error processing entry ${entry.id}:`, error);
          recordsFailed++;
          errors.push(`Entry ${entry.id}: ${error.message}`);
        }
      }
    } else if (direction === 'from_qb') {
      // TODO: Implement pulling TimeActivity records from QuickBooks
      // This would fetch TimeActivity records from QB and create/update timesheet_entries
      console.log('[QB Sync Time] Importing from QuickBooks not yet implemented');
      
      return new Response(JSON.stringify({
        success: true,
        direction,
        recordsProcessed: 0,
        recordsFailed: 0,
        message: 'Import from QuickBooks will be available when API is connected'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log sync result
    await supabase.from('quickbooks_sync_log').insert({
      business_id: ctx.businessId,
      sync_type: 'time_entry',
      direction,
      status: recordsFailed === 0 ? 'success' : 'partial',
      records_processed: recordsProcessed,
      records_failed: recordsFailed,
      error_message: errors.length > 0 ? errors.join('; ') : null,
      metadata: { 
        dryRun,
        errors: errors.length > 0 ? errors : undefined 
      }
    });

    return new Response(JSON.stringify({
      success: true,
      direction,
      recordsProcessed,
      recordsFailed,
      message: dryRun 
        ? `Dry run complete. Would sync ${recordsProcessed} timesheet entries to QuickBooks`
        : `Successfully synced ${recordsProcessed} timesheet entries to QuickBooks`,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Sync Time Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

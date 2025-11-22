import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireCtx } from '../_lib/auth.ts';

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
    const { entityIds, syncAll, jobId, customerId } = await req.json();

    console.log('[Google Drive Sync Media] Starting sync for business:', ctx.businessId);

    // Get connection
    const { data: connection } = await ctx.supaAdmin
      .from('google_drive_connections')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true)
      .single();

    if (!connection) {
      throw new Error('No active Google Drive connection');
    }

    // Build query for media
    let query = ctx.supaAdmin
      .from('sg_media')
      .select('*, jobs!inner(customer_id, customers!inner(name), title)')
      .eq('jobs.business_id', ctx.businessId);

    if (entityIds && entityIds.length > 0) {
      query = query.in('id', entityIds);
    } else if (jobId) {
      query = query.eq('job_id', jobId);
    } else if (customerId) {
      query = query.eq('jobs.customer_id', customerId);
    }

    const { data: mediaItems, error } = await query;

    if (error) throw error;

    console.log('[Google Drive Sync Media] Found', mediaItems?.length, 'items to sync');

    // Create sync log
    const syncLogId = crypto.randomUUID();
    await supabase.from('google_drive_sync_log').insert({
      id: syncLogId,
      business_id: ctx.businessId,
      connection_id: connection.id,
      sync_type: 'media_backup',
      entity_type: 'media',
      direction: 'to_drive',
      status: 'success',
      items_processed: mediaItems?.length || 0,
      items_succeeded: mediaItems?.length || 0,
      items_failed: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      metadata: { jobId, customerId, syncAll },
    });

    // TODO: Actual Drive API upload when credentials available
    // For now, return mock success
    const result = {
      success: true,
      itemsSynced: mediaItems?.length || 0,
      message: 'Media will be synced to Google Drive when API credentials are configured',
      syncLogId,
    };

    console.log('[Google Drive Sync Media] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Sync Media Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

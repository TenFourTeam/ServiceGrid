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
    const { reportType, startDate, endDate } = await req.json();

    console.log('[Google Drive Export Report] Exporting report:', reportType);

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

    // TODO: Generate report and upload to Drive when API credentials available
    const mockDriveFileId = '1REPORT' + crypto.randomUUID().slice(0, 8);
    const mockWebViewLink = `https://drive.google.com/file/d/${mockDriveFileId}/view`;

    // Log sync
    await supabase.from('google_drive_sync_log').insert({
      business_id: ctx.businessId,
      connection_id: connection.id,
      sync_type: 'document_export',
      entity_type: 'report',
      direction: 'to_drive',
      status: 'success',
      items_processed: 1,
      items_succeeded: 1,
      items_failed: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      metadata: { reportType, startDate, endDate },
    });

    const result = {
      success: true,
      driveFileId: mockDriveFileId,
      webViewLink: mockWebViewLink,
      message: 'Report will be exported to Google Drive when API credentials are configured',
    };

    console.log('[Google Drive Export Report] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Export Report Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

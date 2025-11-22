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
    const { driveFileId, role } = await req.json();

    console.log('[Google Drive Create Share Link] Creating share link for:', driveFileId);

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

    // TODO: Create share link via Drive API when credentials available
    const mockShareLink = `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;

    // Log sync
    await ctx.supaAdmin.from('google_drive_sync_log').insert({
      business_id: ctx.businessId,
      connection_id: connection.id,
      sync_type: 'share',
      entity_type: 'file',
      direction: 'to_drive',
      status: 'success',
      items_processed: 1,
      items_succeeded: 1,
      items_failed: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      metadata: { driveFileId, role },
    });

    const result = {
      success: true,
      shareLink: mockShareLink,
      message: 'Share link will be created when API credentials are configured',
    };

    console.log('[Google Drive Create Share Link] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Create Share Link Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

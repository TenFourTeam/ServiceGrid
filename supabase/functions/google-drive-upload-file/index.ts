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
    const { entityType, entityId, fileName, fileUrl, mimeType, folderId } = await req.json();

    console.log('[Google Drive Upload File] Uploading:', fileName);

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

    // TODO: Actual Drive API upload when credentials available
    // Mock file ID for now
    const mockDriveFileId = '1MOCK' + crypto.randomUUID().slice(0, 8);
    const mockWebViewLink = `https://drive.google.com/file/d/${mockDriveFileId}/view`;

    // Create file mapping
    await ctx.supaAdmin.from('google_drive_file_mappings').insert({
      business_id: ctx.businessId,
      connection_id: connection.id,
      sg_entity_type: entityType,
      sg_entity_id: entityId,
      drive_file_id: mockDriveFileId,
      drive_file_name: fileName,
      drive_folder_id: folderId,
      drive_web_view_link: mockWebViewLink,
      mime_type: mimeType,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
    });

    const result = {
      success: true,
      driveFileId: mockDriveFileId,
      webViewLink: mockWebViewLink,
      message: 'File will be uploaded to Google Drive when API credentials are configured',
    };

    console.log('[Google Drive Upload File] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Upload File Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

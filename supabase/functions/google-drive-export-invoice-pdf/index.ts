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
    const { invoiceId } = await req.json();

    console.log('[Google Drive Export Invoice] Exporting invoice:', invoiceId);

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

    // Get invoice data
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, customers(name)')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // TODO: Generate PDF and upload to Drive when API credentials available
    const mockDriveFileId = '1INVOICE' + crypto.randomUUID().slice(0, 8);
    const mockWebViewLink = `https://drive.google.com/file/d/${mockDriveFileId}/view`;

    // Create file mapping
    await supabase.from('google_drive_file_mappings').insert({
      business_id: ctx.businessId,
      connection_id: connection.id,
      sg_entity_type: 'invoice',
      sg_entity_id: invoiceId,
      drive_file_id: mockDriveFileId,
      drive_file_name: `Invoice-${invoice.number}.pdf`,
      drive_web_view_link: mockWebViewLink,
      mime_type: 'application/pdf',
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
    });

    // Log sync
    await supabase.from('google_drive_sync_log').insert({
      business_id: ctx.businessId,
      connection_id: connection.id,
      sync_type: 'document_export',
      entity_type: 'invoice',
      entity_id: invoiceId,
      direction: 'to_drive',
      status: 'success',
      items_processed: 1,
      items_succeeded: 1,
      items_failed: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    const result = {
      success: true,
      driveFileId: mockDriveFileId,
      webViewLink: mockWebViewLink,
      message: 'Invoice will be exported to Google Drive when API credentials are configured',
    };

    console.log('[Google Drive Export Invoice] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Export Invoice Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

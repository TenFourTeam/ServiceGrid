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
    const { customerId, jobId } = await req.json();

    console.log('[Google Drive Create Folders] Creating structure for customer:', customerId);

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

    // Get customer info
    const { data: customer } = await ctx.supaAdmin
      .from('customers')
      .select('name')
      .eq('id', customerId)
      .single();

    // TODO: Create actual folder structure in Drive when API credentials available
    // Mock folder IDs for now
    const mockCustomerFolderId = '1CUSTFOLDER' + crypto.randomUUID().slice(0, 8);
    const mockJobFolderId = jobId ? '1JOBFOLDER' + crypto.randomUUID().slice(0, 8) : undefined;

    const result = {
      success: true,
      customerFolderId: mockCustomerFolderId,
      jobFolderId: mockJobFolderId,
      structure: {
        customer: {
          id: mockCustomerFolderId,
          name: customer?.name,
          webViewLink: `https://drive.google.com/drive/folders/${mockCustomerFolderId}`,
        },
        job: jobId ? {
          id: mockJobFolderId,
          webViewLink: `https://drive.google.com/drive/folders/${mockJobFolderId}`,
        } : undefined,
      },
      message: 'Folders will be created in Google Drive when API credentials are configured',
    };

    console.log('[Google Drive Create Folders] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Create Folders Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

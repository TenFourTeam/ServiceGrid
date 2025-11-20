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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    const ctx = await requireCtx(supabase, authHeader);
    const { folderId, search } = await req.json();

    console.log('[Google Drive List Files] Listing files in folder:', folderId);

    // Get connection
    const { data: connection } = await supabase
      .from('google_drive_connections')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true)
      .single();

    if (!connection) {
      throw new Error('No active Google Drive connection');
    }

    // TODO: List files via Drive API when credentials available
    const mockFiles = [
      {
        id: '1FILE1',
        name: 'Job Photo 1.jpg',
        mimeType: 'image/jpeg',
        size: 2048576,
        webViewLink: 'https://drive.google.com/file/d/1FILE1/view',
        modifiedTime: new Date().toISOString(),
      },
      {
        id: '1FILE2',
        name: 'Invoice INV-001.pdf',
        mimeType: 'application/pdf',
        size: 524288,
        webViewLink: 'https://drive.google.com/file/d/1FILE2/view',
        modifiedTime: new Date().toISOString(),
      },
    ];

    const result = {
      success: true,
      files: mockFiles,
      message: 'Files will be listed from Google Drive when API credentials are configured',
    };

    console.log('[Google Drive List Files] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive List Files Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

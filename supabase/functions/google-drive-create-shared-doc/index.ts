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
    const { title, type, content, teamMemberIds } = await req.json();

    console.log('[Google Drive Create Shared Doc] Creating document:', title);

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

    // TODO: Create Google Doc/Sheet via Drive API when credentials available
    const mockDocId = '1DOC' + crypto.randomUUID().slice(0, 8);
    const mockWebViewLink = `https://docs.google.com/document/d/${mockDocId}/edit`;

    const result = {
      success: true,
      docId: mockDocId,
      webViewLink: mockWebViewLink,
      message: 'Shared document will be created when API credentials are configured',
    };

    console.log('[Google Drive Create Shared Doc] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Create Shared Doc Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

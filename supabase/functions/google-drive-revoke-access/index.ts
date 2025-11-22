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
    const { driveFileId, permissionId } = await req.json();

    console.log('[Google Drive Revoke Access] Revoking permission:', permissionId);

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

    // TODO: Revoke permission via Drive API when credentials available

    const result = {
      success: true,
      message: 'Access will be revoked when API credentials are configured',
    };

    console.log('[Google Drive Revoke Access] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Revoke Access Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

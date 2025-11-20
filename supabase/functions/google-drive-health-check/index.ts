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

    console.log('[Google Drive Health Check] Checking for business:', ctx.businessId);

    // Get connection
    const { data: connection } = await supabase
      .from('google_drive_connections')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true)
      .single();

    if (!connection) {
      return new Response(JSON.stringify({
        isConnected: false,
        tokenValid: false,
        lastSyncSuccess: false,
        pendingSyncs: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check token expiry
    const tokenValid = connection.token_expires_at
      ? new Date(connection.token_expires_at) > new Date()
      : false;

    // Get pending syncs
    const { count: pendingSyncs } = await supabase
      .from('google_drive_file_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', ctx.businessId)
      .eq('sync_status', 'pending');

    // Get last sync status
    const { data: lastSync } = await supabase
      .from('google_drive_sync_log')
      .select('status')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const health = {
      isConnected: connection.is_active,
      tokenValid,
      lastSyncSuccess: lastSync?.status === 'success',
      pendingSyncs: pendingSyncs || 0,
      lastSyncedAt: connection.last_synced_at,
    };

    console.log('[Google Drive Health Check] Result:', health);

    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Health Check Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    console.log('[QB Health Check] Running for business:', ctx.businessId);

    // Check connection status
    const { data: connection } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true)
      .single();

    if (!connection) {
      return new Response(JSON.stringify({
        connection_status: 'error',
        last_heartbeat: new Date().toISOString(),
        token_expires_in_hours: 0,
        sync_success_rate_24h: 0,
        sync_success_rate_7d: 0,
        average_sync_duration_seconds: 0,
        pending_conflicts: 0,
        last_error: 'No active connection found',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate token expiry
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const hoursUntilExpiry = tokenExpiresAt 
      ? (tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
      : 0;

    // Get sync statistics for last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logs24h } = await supabase
      .from('quickbooks_sync_log')
      .select('status, records_processed, records_failed, created_at, metadata')
      .eq('business_id', ctx.businessId)
      .gte('created_at', oneDayAgo);

    // Get sync statistics for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logs7d } = await supabase
      .from('quickbooks_sync_log')
      .select('status')
      .eq('business_id', ctx.businessId)
      .gte('created_at', sevenDaysAgo);

    // Calculate success rates
    const successRate24h = logs24h && logs24h.length > 0
      ? (logs24h.filter(l => l.status === 'success').length / logs24h.length) * 100
      : 100;

    const successRate7d = logs7d && logs7d.length > 0
      ? (logs7d.filter(l => l.status === 'success').length / logs7d.length) * 100
      : 100;

    // Calculate average sync duration
    const durations = logs24h?.map(l => l.metadata?.duration_ms || 0).filter(d => d > 0) || [];
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length / 1000
      : 0;

    // Get pending conflicts
    const { data: conflicts } = await supabase
      .from('quickbooks_conflict_resolutions')
      .select('id')
      .eq('business_id', ctx.businessId)
      .is('resolved_at', null);

    // Determine overall health status
    let connectionStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let lastError: string | undefined;

    if (hoursUntilExpiry < 24) {
      connectionStatus = 'warning';
      lastError = 'Token expiring soon';
    }

    if (successRate24h < 80) {
      connectionStatus = 'warning';
      lastError = 'Low sync success rate';
    }

    if (!connection.is_active || hoursUntilExpiry <= 0) {
      connectionStatus = 'error';
      lastError = 'Connection inactive or token expired';
    }

    const health = {
      connection_status: connectionStatus,
      last_heartbeat: new Date().toISOString(),
      token_expires_in_hours: Math.max(0, Math.floor(hoursUntilExpiry)),
      sync_success_rate_24h: successRate24h,
      sync_success_rate_7d: successRate7d,
      average_sync_duration_seconds: avgDuration,
      pending_conflicts: conflicts?.length || 0,
      last_error: lastError,
    };

    console.log('[QB Health Check] Result:', health);

    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Health Check Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    console.log('[QB Connection Status] Checking for business:', ctx.businessId);

    // Check if connection exists
    const { data: connection, error } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const status = {
      isConnected: !!connection,
      realmId: connection?.realm_id || null,
      lastSyncAt: connection?.last_sync_at || null,
      tokenExpiresAt: connection?.token_expires_at || null,
    };

    console.log('[QB Connection Status]:', status);

    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Connection Status Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

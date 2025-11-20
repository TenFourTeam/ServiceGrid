import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireCtx } from '../_shared/auth.ts';

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
    const { direction } = await req.json(); // 'to_qb' or 'from_qb'

    console.log(`[QB Sync Customers] ${direction} for business ${ctx.businessId}`);

    // TODO: Implement actual sync logic when API credentials available
    // For now, log what would happen

    const mockSyncResult = {
      success: true,
      direction,
      recordsProcessed: 0,
      recordsFailed: 0,
      message: 'Customer sync will execute when QuickBooks is connected',
      previewActions: [
        'Would fetch customers from QuickBooks API',
        'Would match/create customers in ServiceGrid',
        'Would create entity mappings',
        'Would log sync activity'
      ]
    };

    // Log to sync_log table
    await supabase.from('quickbooks_sync_log').insert({
      business_id: ctx.businessId,
      sync_type: 'customer',
      direction,
      status: 'success',
      records_processed: 0,
      metadata: { mode: 'preview' }
    });

    return new Response(JSON.stringify(mockSyncResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Sync Customers Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

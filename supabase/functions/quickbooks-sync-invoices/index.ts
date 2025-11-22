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
    const { direction } = await req.json();

    console.log(`[QB Sync Invoices] ${direction} for business ${ctx.businessId}`);

    // TODO: Implement actual sync logic when API credentials available
    const mockSyncResult = {
      success: true,
      direction,
      recordsProcessed: 0,
      recordsFailed: 0,
      message: 'Invoice sync will execute when QuickBooks is connected',
      previewActions: [
        'Would fetch invoices from ServiceGrid',
        'Would create/update invoices in QuickBooks',
        'Would sync line items, taxes, and discounts',
        'Would create entity mappings',
        'Would log sync activity'
      ]
    };

    // Log to sync_log table
    await supabase.from('quickbooks_sync_log').insert({
      business_id: ctx.businessId,
      sync_type: 'invoice',
      direction,
      status: 'success',
      records_processed: 0,
      metadata: { mode: 'preview' }
    });

    return new Response(JSON.stringify(mockSyncResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Sync Invoices Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

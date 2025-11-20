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

    // QuickBooks webhooks don't require auth header
    const payload = await req.json();
    
    console.log('[QB Webhook] Received:', JSON.stringify(payload, null, 2));

    // Verify webhook signature (when API keys are available)
    // const signature = req.headers.get('intuit-signature');
    // const isValid = await verifySignature(payload, signature);
    // if (!isValid) {
    //   return new Response(JSON.stringify({ error: 'Invalid signature' }), {
    //     status: 401,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //   });
    // }

    // Extract business_id from the webhook (typically in realmId)
    const realmId = payload.eventNotifications?.[0]?.realmId;
    
    if (!realmId) {
      console.error('[QB Webhook] No realmId found in payload');
      return new Response(JSON.stringify({ error: 'Missing realmId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up business_id by realm_id
    const { data: connection } = await supabase
      .from('quickbooks_connections')
      .select('business_id')
      .eq('realm_id', realmId)
      .eq('is_active', true)
      .single();

    if (!connection) {
      console.error(`[QB Webhook] No active connection found for realmId: ${realmId}`);
      return new Response(JSON.stringify({ error: 'Connection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each event notification
    const events = payload.eventNotifications || [];
    
    for (const notification of events) {
      for (const dataChange of notification.dataChangeEvent?.entities || []) {
        const { name, id, operation } = dataChange;
        
        console.log(`[QB Webhook] Processing: ${operation} on ${name} ${id}`);

        // Store webhook event
        await supabase
          .from('quickbooks_webhook_events')
          .insert({
            business_id: connection.business_id,
            event_type: operation,
            entity_type: name,
            qb_entity_id: id,
            payload: dataChange,
            processed: false,
          });

        // TODO: Queue background job to sync this entity
        // For now, just log it
        console.log(`[QB Webhook] Queued sync for ${name} ${id}`);
      }
    }

    return new Response(JSON.stringify({ success: true, eventsProcessed: events.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Webhook Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

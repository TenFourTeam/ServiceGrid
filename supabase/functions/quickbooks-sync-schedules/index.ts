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

    // GET - List schedules
    if (req.method === 'GET') {
      const { data, error } = await ctx.supaAdmin
        .from('quickbooks_sync_schedules')
        .select('*')
        .eq('business_id', ctx.businessId)
        .order('entity_type', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create schedule
    if (req.method === 'POST') {
      const body = await req.json();
      const { entity_type, enabled, frequency_minutes, direction, filters } = body;

      const nextRunAt = enabled 
        ? new Date(Date.now() + frequency_minutes * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('quickbooks_sync_schedules')
        .insert({
          business_id: ctx.businessId,
          entity_type,
          enabled: enabled || false,
          frequency_minutes: frequency_minutes || 60,
          direction: direction || 'bidirectional',
          filters: filters || {},
          next_run_at: nextRunAt,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH - Update schedule
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id, ...updates } = body;

      // Recalculate next_run_at if frequency or enabled status changed
      if (updates.frequency_minutes || updates.enabled !== undefined) {
        const currentSchedule = await supabase
          .from('quickbooks_sync_schedules')
          .select('frequency_minutes, enabled')
          .eq('id', id)
          .single();

        const frequency = updates.frequency_minutes || currentSchedule.data?.frequency_minutes || 60;
        const enabled = updates.enabled !== undefined ? updates.enabled : currentSchedule.data?.enabled;

        updates.next_run_at = enabled 
          ? new Date(Date.now() + frequency * 60 * 1000).toISOString()
          : null;
      }

      const { data, error } = await supabase
        .from('quickbooks_sync_schedules')
        .update(updates)
        .eq('id', id)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Sync Schedules Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;

    if (req.method === 'GET') {
      // Fetch pricing rules for the current business
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('business_id', ctx.businessId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch pricing rules: ${error.message}`);
      }

      return json(data || {
        material_markup_percent: 50,
        labor_rate_per_hour: 8500,
        equipment_markup_percent: 30,
        minimum_charge: 15000,
        emergency_multiplier: 1.5
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const {
        material_markup_percent,
        labor_rate_per_hour,
        equipment_markup_percent,
        minimum_charge,
        emergency_multiplier
      } = body;

      // Upsert pricing rules
      const { error } = await supabase
        .from('pricing_rules')
        .upsert({
          business_id: ctx.businessId,
          material_markup_percent,
          labor_rate_per_hour,
          equipment_markup_percent,
          minimum_charge,
          emergency_multiplier
        }, {
          onConflict: 'business_id'
        });

      if (error) {
        throw new Error(`Failed to save pricing rules: ${error.message}`);
      }

      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: unknown) {
    console.error('[pricing-rules-crud] Error:', error);
    return json(
      { error: (error as Error).message || 'Failed to process request' },
      { status: 500 }
    );
  }
});

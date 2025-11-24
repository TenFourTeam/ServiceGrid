import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { requireCtx, corsHeaders, json } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate and get business context
    const ctx = await requireCtx(req);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Query phone numbers for the business
    const { data: phoneNumbers, error } = await supabase
      .from('phone_numbers')
      .select('id, phone_number, friendly_name, twilio_sid, capabilities, status, ai_agent_enabled, ai_agent_config, created_at, updated_at')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching phone numbers:', error);
      return json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return json({ phoneNumbers: phoneNumbers || [] }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in voip-phone-numbers-list:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500, headers: corsHeaders }
    );
  }
});

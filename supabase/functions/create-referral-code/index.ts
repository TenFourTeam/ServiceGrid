import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, requireCtx } from "../_lib/auth.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await requireCtx(req);
    if (!payload?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use user's profile ID as the referral code for simplicity
    const referralCode = payload.userId;

    // Check if referral code already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_user_id', payload.userId)
      .eq('referral_code', referralCode)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ 
          referral_code: referralCode,
          message: 'Referral code already exists' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a new referral entry for tracking (with click_count initialized to 0)
    const { data: newReferral, error } = await supabase
      .from('referrals')
      .insert({
        referrer_user_id: payload.userId,
        referral_code: referralCode,
        status: 'pending',
        click_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating referral code:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create referral code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created referral code:', newReferral);

    return new Response(
      JSON.stringify({ 
        referral_code: referralCode,
        message: 'Referral code created successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-referral-code:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

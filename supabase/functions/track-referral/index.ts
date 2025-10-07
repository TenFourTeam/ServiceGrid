import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referral_code } = await req.json();

    if (!referral_code) {
      return new Response(
        JSON.stringify({ error: 'Referral code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the referral record and increment click count
    const { data: existingReferral, error: fetchError } = await supabase
      .from('referrals')
      .select('id, click_count')
      .eq('referral_code', referral_code)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching referral:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to track referral' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingReferral) {
      console.log('Referral code not found, creating pending record:', referral_code);
      
      // Create a pending referral record
      const { data: newReferral, error: createError } = await supabase
        .from('referrals')
        .insert({
          referral_code,
          referrer_user_id: referral_code, // Will be updated when referrer creates their code
          click_count: 1,
          status: 'pending'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating pending referral:', createError);
        return new Response(
          JSON.stringify({ success: true, click_count: 1, created: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Created pending referral:', newReferral);
      return new Response(
        JSON.stringify({ success: true, click_count: 1, created: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment the click count
    const { error: updateError } = await supabase
      .from('referrals')
      .update({ click_count: (existingReferral.click_count || 0) + 1 })
      .eq('id', existingReferral.id);

    if (updateError) {
      console.error('Error updating click count:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update click count' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tracked referral click:', { referral_code, new_count: (existingReferral.click_count || 0) + 1 });

    return new Response(
      JSON.stringify({ 
        success: true,
        click_count: (existingReferral.click_count || 0) + 1
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-referral:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

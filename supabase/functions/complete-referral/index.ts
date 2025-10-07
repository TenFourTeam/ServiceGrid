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
    const { referral_code, user_email, user_id } = await req.json();

    if (!referral_code || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Referral code and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the referral by code
    const { data: existingReferral, error: fetchError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referral_code', referral_code)
      .single();

    if (fetchError) {
      console.error('Error fetching referral:', fetchError);
      
      // If referral doesn't exist, create it
      if (fetchError.code === 'PGRST116') {
        console.log('Creating new referral for code:', referral_code);
        
        const { data: newReferral, error: createError } = await supabase
          .from('referrals')
          .insert({
            referral_code,
            referrer_user_id: referral_code, // This should ideally be looked up
            referred_user_id: user_id,
            referred_email: user_email,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating referral:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to complete referral' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Created and completed referral:', newReferral);
        return new Response(
          JSON.stringify({ success: true, referral: newReferral }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to complete referral' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update existing referral
    const { data: updatedReferral, error: updateError } = await supabase
      .from('referrals')
      .update({
        referred_user_id: user_id,
        referred_email: user_email,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', existingReferral.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating referral:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to complete referral' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Completed referral:', updatedReferral);

    return new Response(
      JSON.stringify({ success: true, referral: updatedReferral }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in complete-referral:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

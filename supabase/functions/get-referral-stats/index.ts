import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, getAuthenticatedUser } from "../_lib/auth.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await getAuthenticatedUser(req);
    if (!payload?.profileId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all referrals for this user
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', payload.profileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch referral stats' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = {
      total_clicks: referrals?.length || 0,
      total_signups: referrals?.filter(r => r.status === 'completed').length || 0,
      pending_referrals: referrals?.filter(r => r.status === 'pending').length || 0,
      completed_referrals: referrals?.filter(r => r.status === 'completed').length || 0,
      referrals: referrals || []
    };

    return new Response(
      JSON.stringify(stats),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-referral-stats:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

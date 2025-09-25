import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { requireCtx } from '../_lib/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ctx = await requireCtx(req);
    const { inviteId } = await req.json();

    if (!inviteId) {
      return new Response(
        JSON.stringify({ error: 'Invite ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[decline-invite] Declining invite:', inviteId, 'for user:', ctx.userId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's profile to verify they can decline this invite
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('clerk_user_id', ctx.userId)
      .single();

    if (profileError || !profile) {
      console.error('[decline-invite] Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the invite exists and belongs to this user
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, email, redeemed_at, revoked_at')
      .eq('id', inviteId)
      .eq('email', profile.email)
      .single();

    if (inviteError || !invite) {
      console.error('[decline-invite] Invite not found:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Invite not found or not accessible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invite is already processed
    if (invite.redeemed_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has already been accepted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invite.revoked_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has already been declined' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark the invite as revoked (declined)
    const { data: updatedInvite, error: updateError } = await supabase
      .from('invites')
      .update({ 
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', inviteId)
      .select()
      .single();

    if (updateError) {
      console.error('[decline-invite] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to decline invite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[decline-invite] Successfully declined invite:', inviteId);

    return new Response(
      JSON.stringify({ 
        message: 'Invite declined successfully',
        invite: updatedInvite
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[decline-invite] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
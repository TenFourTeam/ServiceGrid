import { createClient } from 'jsr:@supabase/supabase-js@2';
import { requireCtx } from '../_lib/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ctx = await requireCtx(req);
    console.log('[user-pending-invites] User context:', ctx);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's profile to get their email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('clerk_user_id', ctx.userId)
      .single();

    if (profileError || !profile) {
      console.error('[user-pending-invites] Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[user-pending-invites] User email:', profile.email);

    // Fetch pending invites for this user's email
    const { data: invites, error: invitesError } = await supabase
      .from('invites')
      .select(`
        id,
        business_id,
        role,
        email,
        expires_at,
        created_at,
        invited_by,
        token_hash,
        businesses!inner (
          id,
          name,
          logo_url
        ),
        invited_by_profile:profiles!invited_by (
          full_name,
          email
        )
      `)
      .eq('email', profile.email)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (invitesError) {
      console.error('[user-pending-invites] Invites error:', invitesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending invites' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[user-pending-invites] Found invites:', invites?.length || 0);

    return new Response(
      JSON.stringify({ invites: invites || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[user-pending-invites] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[user-pending-invites] ${req.method} request received`);
    
    if (req.method !== 'GET') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const ctx = await requireCtx(req);
    console.log('[user-pending-invites] User context:', ctx);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's profile to get their email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('clerk_user_id', ctx.clerkUserId)
      .single();

    if (profileError || !profile) {
      console.error('[user-pending-invites] Profile error:', profileError);
      return json({ error: 'User profile not found' }, { status: 404 });
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
      throw new Error(`Failed to fetch pending invites: ${invitesError.message}`);
    }

    console.log('[user-pending-invites] Found invites:', invites?.length || 0);
    return json({ invites: invites || [] });

  } catch (error: any) {
    console.error('[user-pending-invites] Error:', error);
    return json(
      { error: error.message || 'Failed to fetch pending invites' },
      { status: 500 }
    );
  }
});
import { corsHeaders } from '../_shared/cors.ts';
import { requireCtx } from '../_lib/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

console.log('🚀 [accept-invite] Function loaded');

Deno.serve(async (req) => {
  console.log(`[accept-invite] ${req.method} request to ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[accept-invite] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[accept-invite] Method ${req.method} not allowed`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Parse request body
    const { token_hash } = await req.json();
    
    if (!token_hash) {
      console.log('[accept-invite] Missing token_hash in request');
      return new Response(
        JSON.stringify({ error: 'Missing token_hash' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[accept-invite] Processing invite with token_hash: ${token_hash.substring(0, 10)}...`);

    // Authenticate user
    const ctx = await requireCtx(req);
    console.log(`[accept-invite] Authenticated user: ${ctx.userId}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the invite
    console.log('[accept-invite] Looking up invite');
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('invites')
      .select('*')
      .eq('token_hash', token_hash)
      .single();

    if (inviteError || !invite) {
      console.error('[accept-invite] Invite not found:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Invalid invite token' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate invite
    if (invite.redeemed_at) {
      console.log('[accept-invite] Invite already redeemed');
      return new Response(
        JSON.stringify({ error: 'Invite has already been redeemed' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (invite.revoked_at) {
      console.log('[accept-invite] Invite has been revoked');
      return new Response(
        JSON.stringify({ error: 'Invite has been revoked' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      console.log('[accept-invite] Invite has expired');
      return new Response(
        JSON.stringify({ error: 'Invite has expired' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify email matches
    if (invite.email !== ctx.email) {
      console.log(`[accept-invite] Email mismatch: invite for ${invite.email}, user is ${ctx.email}`);
      return new Response(
        JSON.stringify({ error: 'This invite is for a different email address' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if invite is already accepted (using new accepted_at column)
    if (invite.accepted_at) {
      console.log('[accept-invite] Invite already accepted');
      return new Response(
        JSON.stringify({ 
          message: 'Invite has already been accepted',
          business_id: invite.business_id 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Accept the invite by setting accepted_at timestamp
    console.log('[accept-invite] Accepting invite - setting accepted_at timestamp');
    const { error: acceptError } = await supabaseAdmin
      .from('invites')
      .update({
        accepted_at: new Date().toISOString(),
        redeemed_at: new Date().toISOString(),
        redeemed_by: ctx.userId
      })
      .eq('id', invite.id);

    if (acceptError) {
      console.error('[accept-invite] Failed to accept invite:', acceptError);
      return new Response(
        JSON.stringify({ error: 'Failed to accept invite' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log audit action
    console.log('[accept-invite] Logging audit action');
    await supabaseAdmin.rpc('log_audit_action', {
      p_business_id: invite.business_id,
      p_user_id: ctx.userId,
      p_action: 'accept_invite',
      p_resource_type: 'business_member',
      p_resource_id: ctx.userId,
      p_details: {
        invite_id: invite.id,
        role: 'worker',
        invited_by: invite.invited_by
      }
    });

    console.log('[accept-invite] Successfully accepted invite');
    return new Response(
      JSON.stringify({ 
        message: 'Successfully joined business as worker',
        business_id: invite.business_id,
        role: 'worker'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[accept-invite] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
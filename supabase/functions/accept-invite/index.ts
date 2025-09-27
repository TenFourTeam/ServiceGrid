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
    const { inviteId } = await req.json();
    
    if (!inviteId) {
      console.log('[accept-invite] Missing inviteId in request');
      return new Response(
        JSON.stringify({ error: 'Missing inviteId' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[accept-invite] Processing invite: ${inviteId}`);

    // Authenticate user
    const ctx = await requireCtx(req);
    console.log(`[accept-invite] Authenticated user: ${ctx.userId}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the invite and verify it belongs to the current user
    console.log('[accept-invite] Looking up invite');
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('invites')
      .select('id, business_id, role, invited_user_id, expires_at, accepted_at, revoked_at, invited_by')
      .eq('id', inviteId)
      .eq('invited_user_id', ctx.userId)
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

    // Check if invite is valid
    if (invite.accepted_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has already been accepted' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (invite.revoked_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has been revoked' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invite has expired' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user already has permission to this business
    const { data: existingPermission, error: permissionError } = await supabaseAdmin
      .from('business_permissions')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('business_id', invite.business_id)
      .maybeSingle();

    if (permissionError) {
      console.error('[accept-invite] Error checking existing permissions:', permissionError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing permissions' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (existingPermission) {
      return new Response(
        JSON.stringify({ error: 'User already has access to this business' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Accept the invite and create business permission
    const now = new Date().toISOString();

    // Mark invite as accepted
    const { error: updateError } = await supabaseAdmin
      .from('invites')
      .update({ 
        accepted_at: now,
        redeemed_at: now,
        redeemed_by: ctx.userId
      })
      .eq('id', inviteId);

    if (updateError) {
      console.error('[accept-invite] Error updating invite:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to accept invite' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create business permission
    const { error: permissionCreateError } = await supabaseAdmin
      .from('business_permissions')
      .insert({
        user_id: ctx.userId,
        business_id: invite.business_id,
        granted_by: ctx.userId, // Self-granted via invite acceptance
        granted_at: now
      });

    if (permissionCreateError) {
      console.error('[accept-invite] Error creating business permission:', permissionCreateError);
      
      // Rollback invite acceptance
      await supabaseAdmin
        .from('invites')
        .update({ 
          accepted_at: null,
          redeemed_at: null,
          redeemed_by: null
        })
        .eq('id', inviteId);

      return new Response(
        JSON.stringify({ error: 'Failed to create business permission' }), 
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
        message: 'Invite accepted successfully',
        business_id: invite.business_id
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
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { corsHeaders, json, requireCtx } from "../_lib/auth.ts";

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { action, token_hash } = await req.json();

    if (!action || !['accept', 'decline'].includes(action)) {
      return json({ error: 'Valid action (accept/decline) is required' }, { status: 400 });
    }

    if (!token_hash) {
      return json({ error: 'Token hash is required' }, { status: 400 });
    }

    console.log(`[manage-invite] Processing ${action} action for token hash: ${token_hash.substring(0, 10)}...`);

    // Get authenticated user context
    const ctx = await requireCtx(req);
    console.log(`[manage-invite] User context: ${ctx.email}`);

    // Find the invite using the token_hash directly (no re-hashing)
    const { data: invite, error: inviteError } = await ctx.supaAdmin
      .from('invites')
      .select('*')
      .eq('token_hash', token_hash)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      console.log('[manage-invite] Invite not found or invalid:', inviteError);
      return json({ error: 'Invalid or expired invite' }, { status: 400 });
    }

    // Verify the invite email matches the authenticated user's email
    if (invite.email !== ctx.email) {
      console.log(`[manage-invite] Email mismatch: invite=${invite.email}, user=${ctx.email}`);
      return json({ error: 'This invite is not for your email address' }, { status: 403 });
    }

    console.log(`[manage-invite] Found valid invite for business: ${invite.business_id}`);

    if (action === 'decline') {
      // Mark invite as revoked
      const { error: revokeError } = await ctx.supaAdmin
        .from('invites')
        .update({
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invite.id);

      if (revokeError) {
        console.error('[manage-invite] Failed to revoke invite:', revokeError);
        return json({ error: 'Failed to decline invite' }, { status: 500 });
      }

      // Log audit action
      await ctx.supaAdmin.rpc('log_audit_action', {
        p_business_id: invite.business_id,
        p_user_id: ctx.userId,
        p_action: 'invite_declined',
        p_resource_type: 'business_member',
        p_resource_id: ctx.userId,
        p_details: { email: invite.email, role: invite.role }
      });

      console.log('[manage-invite] Invite declined successfully');
      return json({ message: 'Invite declined successfully' });
    }

    // Handle accept action
    if (action === 'accept') {
      // Check if user is already a member of this business
      const { data: existingMember } = await ctx.supaAdmin
        .from('business_members')
        .select('*')
        .eq('business_id', invite.business_id)
        .eq('user_id', ctx.userId)
        .single();

      if (existingMember) {
        // Mark invite as redeemed even though user was already a member
        await ctx.supaAdmin
          .from('invites')
          .update({
            redeemed_at: new Date().toISOString(),
            redeemed_by: ctx.userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invite.id);

        return json({ 
          message: 'You are already a member of this business',
          business_id: invite.business_id,
          role: existingMember.role 
        });
      }

      // Add user to business members
      const { error: memberError } = await ctx.supaAdmin
        .from('business_members')
        .insert({
          business_id: invite.business_id,
          user_id: ctx.userId,
          role: invite.role,
          invited_by: invite.invited_by,
          joined_at: new Date().toISOString(),
          joined_via_invite: true,
        });

      if (memberError) {
        console.error('[manage-invite] Failed to add business member:', memberError);
        return json({ error: 'Failed to join business' }, { status: 500 });
      }

      // Mark invite as redeemed
      const { error: redeemError } = await ctx.supaAdmin
        .from('invites')
        .update({
          redeemed_at: new Date().toISOString(),
          redeemed_by: ctx.userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invite.id);

      if (redeemError) {
        console.error('[manage-invite] Failed to mark invite as redeemed:', redeemError);
      }

      // Log audit action
      await ctx.supaAdmin.rpc('log_audit_action', {
        p_business_id: invite.business_id,
        p_user_id: ctx.userId,
        p_action: 'invite_accepted',
        p_resource_type: 'business_member',
        p_resource_id: ctx.userId,
        p_details: { email: invite.email, role: invite.role }
      });

      console.log('[manage-invite] Invite accepted successfully');
      return json({
        message: 'Successfully joined the business',
        business_id: invite.business_id,
        role: invite.role,
      });
    }

    // This should not be reached, but ensure all code paths return a response
    return json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[manage-invite] Error processing invite:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
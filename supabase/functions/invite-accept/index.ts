import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { corsHeaders, json, requireCtx } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { inviteId } = await req.json();

    if (!inviteId) {
      return json({ error: 'Invite ID is required' }, { status: 400 });
    }

    const { userId, email, supaAdmin } = await requireCtx(req);

    console.log('Accepting invite for user:', userId, 'invite:', inviteId);

    // Find the invite and verify it belongs to this user
    const { data: invite, error: inviteError } = await supaAdmin
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .eq('email', email)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      console.log('Invite not found or invalid:', inviteError);
      return json({ error: 'Invalid or expired invite' }, { status: 400 });
    }

    // Check if user profile exists
    const { data: existingProfile } = await supaAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // Create profile if it doesn't exist
    if (!existingProfile) {
      const { error: profileError } = await supaAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: email || invite.email,
          clerk_user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        return json({ error: 'Failed to create user profile' }, { status: 500 });
      }

      console.log('User profile created for:', userId);
    }

    // Check if user is already a member of this business
    const { data: existingMember } = await supaAdmin
      .from('business_members')
      .select('*')
      .eq('business_id', invite.business_id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      // Mark invite as redeemed even though user was already a member
      await supaAdmin
        .from('invites')
        .update({
          redeemed_at: new Date().toISOString(),
          redeemed_by: userId,
        })
        .eq('id', invite.id);

      return json({ message: 'You are already a member of this business' });
    }

    // Add user to business members with invite tracking
    const { error: memberError } = await supaAdmin
      .from('business_members')
      .insert({
        business_id: invite.business_id,
        user_id: userId,
        role: invite.role,
        invited_by: invite.invited_by,
        joined_at: new Date().toISOString(),
        joined_via_invite: true,
      });

    if (memberError) {
      console.error('Failed to add business member:', memberError);
      return json({ error: 'Failed to join business' }, { status: 500 });
    }

    // Mark invite as redeemed
    const { error: redeemError } = await supaAdmin
      .from('invites')
      .update({
        redeemed_at: new Date().toISOString(),
        redeemed_by: userId,
      })
      .eq('id', invite.id);

    if (redeemError) {
      console.error('Failed to mark invite as redeemed:', redeemError);
    }

    // Log audit action
    await supaAdmin.rpc('log_audit_action', {
      p_business_id: invite.business_id,
      p_user_id: userId,
      p_action: 'invite_accepted',
      p_resource_type: 'business_member',
      p_resource_id: userId,
      p_details: { email: invite.email, role: invite.role }
    });

    console.log('Invite accepted successfully');

    return json({
      message: 'Successfully joined the business',
      businessId: invite.business_id,
      role: invite.role,
    });

  } catch (error) {
    console.error('Error accepting invite:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
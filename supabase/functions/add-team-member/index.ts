import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { targetUserId, businessId, role = 'worker' } = await req.json();
    
    // Use businessId override to ensure we're operating on the correct business
    const ctx = await requireCtx(req, { businessId });

    if (!targetUserId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!businessId) {
      return json({ error: 'Business ID is required' }, { status: 400 });
    }

    console.log(`➕ Adding user ${targetUserId} to business ${businessId} as ${role}`);

    // Get business details for email
    const { data: business, error: businessError } = await ctx.supaAdmin
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return json({ error: 'Business not found' }, { status: 404 });
    }

    // Get target user details
    const { data: targetUser, error: userError } = await ctx.supaAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember } = await ctx.supaAdmin
      .from('business_members')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', targetUserId)
      .single();

    if (existingMember) {
      return json({ error: 'User is already a member of this business' }, { status: 400 });
    }

    // Check for pending invites first
    const { data: pendingInvites } = await ctx.supaAdmin
      .from('invites')
      .select('id, token_hash')
      .eq('email', targetUser.email)
      .eq('business_id', businessId)
      .is('redeemed_at', null)
      .is('revoked_at', null);

    const hasInvites = pendingInvites && pendingInvites.length > 0;

    // Add user to business members
    const { error: memberError } = await ctx.supaAdmin
      .from('business_members')
      .insert({
        business_id: businessId,
        user_id: targetUserId,
        role: role,
        invited_by: ctx.userId,
        joined_at: new Date().toISOString(),
        joined_via_invite: hasInvites,
      });

    if (memberError) {
      console.error('Failed to add team member:', memberError);
      return json({ error: 'Failed to add team member' }, { status: 500 });
    }

    // Log audit action
    await ctx.supaAdmin.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: ctx.userId,
      p_action: 'team_member_added',
      p_resource_type: 'business_member',
      p_resource_id: targetUserId,
      p_details: { 
        added_user_email: targetUser.email,
        role: role,
        method: 'direct_addition'
      }
    });

  // Clean up any pending invites for this user to this business
  if (hasInvites) {
    // Mark invites as redeemed
    await ctx.supaAdmin
      .from('invites')
      .update({ 
        redeemed_at: new Date().toISOString(),
        redeemed_by: targetUserId
      })
      .in('id', pendingInvites.map((inv: any) => inv.id));
    
    console.log(`🧹 Auto-redeemed ${pendingInvites.length} pending invites for ${targetUser.email}`);
    
    // Log the cleanup action
    await ctx.supaAdmin.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: ctx.userId,
      p_action: 'invite_auto_redeemed',
      p_resource_type: 'invite',
      p_resource_id: pendingInvites[0].id,
      p_details: { 
        redeemed_invite_count: pendingInvites.length,
        user_email: targetUser.email,
        reason: 'direct_addition'
      }
    });
  }

  console.log(`✅ Successfully added user ${targetUser.email} to business ${business.name}`);

  return json({
    message: 'Team member added successfully',
    member: {
      id: targetUserId,
      email: targetUser.email,
      name: targetUser.full_name,
      role: role,
      joined_at: new Date().toISOString(),
      joined_via_invite: hasInvites
    }
  });

  } catch (error) {
    console.error('Error in add-team-member:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
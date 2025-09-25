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
    const ctx = await requireCtx(req);
    const { targetUserId, role = 'worker' } = await req.json();

    if (!targetUserId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`➕ Adding user ${targetUserId} to business ${ctx.businessId} as ${role}`);

    // Verify the requesting user can manage this business
    const { data: requestorMembership } = await ctx.supaAdmin
      .from('business_members')
      .select('role')
      .eq('business_id', ctx.businessId)
      .eq('user_id', ctx.userId)
      .eq('role', 'owner')
      .single();

    if (!requestorMembership) {
      return json({ error: 'Not authorized to manage this business' }, { status: 403 });
    }

    // Get business details for email
    const { data: business, error: businessError } = await ctx.supaAdmin
      .from('businesses')
      .select('id, name')
      .eq('id', ctx.businessId)
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
      .eq('business_id', ctx.businessId)
      .eq('user_id', targetUserId)
      .single();

    if (existingMember) {
      return json({ error: 'User is already a member of this business' }, { status: 400 });
    }

    // Add user to business members with pending status
    const { error: memberError } = await ctx.supaAdmin
      .from('business_members')
      .insert({
        business_id: ctx.businessId,
        user_id: targetUserId,
        role: role,
        invited_by: ctx.userId,
        joined_at: null, // Pending membership - user must accept
        joined_via_invite: false, // Direct addition, not via invite
      });

    if (memberError) {
      console.error('Failed to add team member:', memberError);
      return json({ error: 'Failed to add team member' }, { status: 500 });
    }

    // Log audit action
    await ctx.supaAdmin.rpc('log_audit_action', {
      p_business_id: ctx.businessId,
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

    console.log(`✅ Successfully sent membership request to ${targetUser.email} for business ${business.name}`);

    return json({
      message: 'Membership request sent successfully',
      member: {
        id: targetUserId,
        email: targetUser.email,
        name: targetUser.full_name,
        role: role,
        joined_at: null, // Pending membership
        joined_via_invite: false
      }
    });

  } catch (error) {
    console.error('Error in add-team-member:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
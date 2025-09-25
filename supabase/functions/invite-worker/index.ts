import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";
import { buildInviteEmail } from "../_shared/inviteEmailTemplates.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);

    if (req.method === 'GET') {
      // Verify user is owner of the business
      const { data: membership } = await ctx.supaAdmin
        .from('business_members')
        .select('role')
        .eq('business_id', ctx.businessId)
        .eq('user_id', ctx.userId)
        .eq('role', 'owner')
        .single();

      if (!membership) {
        return json({ error: 'Not authorized to manage this business' }, { status: 403 });
      }

      console.log(`🔍 Fetching invites for business: ${ctx.businessId}`);
      
      // Get pending invites - simplified query without foreign key
      const { data: invites, error } = await ctx.supaAdmin
        .from('invites')
        .select(`
          id,
          email,
          role,
          expires_at,
          created_at,
          invited_by
        `)
        .eq('business_id', ctx.businessId)
        .is('redeemed_at', null)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching invites:', error);
        return json({ error: 'Failed to fetch invites' }, { status: 500 });
      }

      console.log(`✅ Found ${invites?.length || 0} pending invites`);
      console.log('📋 Invites data:', invites);

      return json({ invites: invites || [] });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const inviteId = url.searchParams.get('invite_id');

      if (!inviteId) {
        return json({ error: 'Invite ID is required' }, { status: 400 });
      }

      // Get the invite and verify permissions
      const { data: invite, error: inviteError } = await ctx.supaAdmin
        .from('invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (inviteError || !invite) {
        return json({ error: 'Invite not found' }, { status: 404 });
      }

      // Verify user can manage this business
      const { data: membership } = await ctx.supaAdmin
        .from('business_members')
        .select('role')
        .eq('business_id', (invite as any).business_id)
        .eq('user_id', ctx.userId)
        .eq('role', 'owner')
        .single();

      if (!membership) {
        return json({ error: 'Not authorized to manage this business' }, { status: 403 });
      }

      const { error } = await ctx.supaAdmin
        .from('invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', inviteId);

      if (error) {
        console.error('Error revoking invite:', error);
        return json({ error: 'Failed to revoke invite' }, { status: 500 });
      }

      // Log audit action
      await ctx.supaAdmin.rpc('log_audit_action', {
        p_business_id: invite.business_id,
        p_user_id: ctx.userId,
        p_action: 'invite_revoked',
        p_resource_type: 'business_member',
        p_resource_id: inviteId,
        p_details: { email: invite.email }
      });

      return json({ message: 'Invite revoked successfully' });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { inviteId } = await req.json();

      if (!inviteId) {
        return json({ error: 'Invite ID is required' }, { status: 400 });
      }

      // Get the invite and verify permissions
      const { data: invite, error: inviteError } = await ctx.supaAdmin
        .from('invites')
        .select('*, businesses!inner(name, logo_url)')
        .eq('id', inviteId)
        .single();

      if (inviteError || !invite) {
        return json({ error: 'Invite not found' }, { status: 404 });
      }

      // Verify user can manage this business
      const { data: membership } = await ctx.supaAdmin
        .from('business_members')
        .select('role')
        .eq('business_id', (invite as any).business_id)
        .eq('user_id', ctx.userId)
        .eq('role', 'owner')
        .single();

      if (!membership) {
        return json({ error: 'Not authorized to manage this business' }, { status: 403 });
      }

      // Generate new token and extend expiry
      const token = crypto.randomUUID();
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const { error } = await ctx.supaAdmin
        .from('invites')
        .update({
          token_hash: tokenHash,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', inviteId);

      if (error) {
        console.error('Error updating invite:', error);
        return json({ error: 'Failed to update invite' }, { status: 500 });
      }

      // Get inviter details
      const { data: inviter } = await ctx.supaAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', ctx.userId)
        .single();

      // Generate invitation URL and send email
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://preview--lawn-flow-dash.lovable.app';
      const inviteUrl = `${frontendUrl}/invite?token=${token}`;
      const business = invite.businesses;

      // Log audit action (no email for now)
      await ctx.supaAdmin.rpc('log_audit_action', {
        p_business_id: invite.business_id,
        p_user_id: ctx.userId,
        p_action: 'invite_resent',
        p_resource_type: 'business_member',
        p_resource_id: inviteId,
        p_details: { email: invite.email }
      });

      return json({ 
        message: 'Invite updated successfully (email sending temporarily disabled)',
        invite_url: inviteUrl
      });
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    // POST - Create new invite and send email
    const { email } = await req.json();

    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    // Verify the user can manage this business
    const { data: membership } = await ctx.supaAdmin
      .from('business_members')
      .select('role')
      .eq('business_id', ctx.businessId)
      .eq('user_id', ctx.userId)
      .eq('role', 'owner')
      .single();

    if (!membership) {
      return json({ error: 'Not authorized to manage this business' }, { status: 403 });
    }

    // Get business details and inviter info
    const { data: business, error: businessError } = await ctx.supaAdmin
      .from('businesses')
      .select('id, name, logo_url')
      .eq('id', ctx.businessId)
      .single();

    if (businessError || !business) {
      return json({ error: 'Business not found or not owned by user' }, { status: 403 });
    }

    // Get inviter details
    const { data: inviter, error: inviterError } = await ctx.supaAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', ctx.userId)
      .single();


    // Check for existing invite or membership
    const { data: existingInvite } = await ctx.supaAdmin
      .from('invites')
      .select('id')
      .eq('business_id', ctx.businessId)
      .eq('email', email)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return json({ error: 'Active invite already exists for this email' }, { status: 409 });
    }

    const { data: existingMember } = await ctx.supaAdmin
      .from('business_members')
      .select('id')
      .eq('business_id', ctx.businessId)
      .in('user_id', [
        ctx.supaAdmin.from('profiles').select('id').eq('email', email)
      ])
      .single();

    if (existingMember) {
      return json({ error: 'User is already a member of this business' }, { status: 409 });
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create invite
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const { data: invite, error: inviteError } = await ctx.supaAdmin
      .from('invites')
      .insert({
        business_id: ctx.businessId,
        email,
        role: 'worker',
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        invited_by: ctx.userId,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Failed to create invite:', inviteError);
      return json({ error: 'Failed to create invite' }, { status: 500 });
    }

    // Generate invitation URL (no email for now)
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://preview--lawn-flow-dash.lovable.app';
    const inviteUrl = `${frontendUrl}/invite?token=${token}`;
    
    console.log('Invitation created successfully (email sending temporarily disabled)');

    // Log audit action
    await ctx.supaAdmin.rpc('log_audit_action', {
      p_business_id: ctx.businessId,
      p_user_id: ctx.userId,
      p_action: 'invite_sent',
      p_resource_type: 'business_member',
      p_resource_id: invite.id,
      p_details: { email, role: 'worker' }
    });

    return json({
      success: true,
      message: 'Invitation created successfully (email sending temporarily disabled)',
      invite_id: invite.id,
    });

  } catch (error) {
    console.error('Error in invite-worker:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
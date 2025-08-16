import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";
import { buildInviteEmail } from "../_shared/inviteEmailTemplates.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { userId, businessId: contextBusinessId, supaAdmin } = await requireCtx(req);
    const { businessId, email } = await req.json();

    if (!businessId || !email) {
      return json({ error: 'Business ID and email are required' }, 400);
    }

    // Verify the user can manage this business
    const { data: membership } = await supaAdmin
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    if (!membership) {
      return json({ error: 'Not authorized to manage this business' }, 403);
    }

    // Get business details and inviter info
    const { data: business, error: businessError } = await supaAdmin
      .from('businesses')
      .select('id, name, logo_url')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return json({ error: 'Business not found or not owned by user' }, 403);
    }

    // Get inviter details
    const { data: inviter, error: inviterError } = await supaAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();


    // Check for existing invite or membership
    const { data: existingInvite } = await supaAdmin
      .from('invites')
      .select('id')
      .eq('business_id', businessId)
      .eq('email', email)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return json({ error: 'Active invite already exists for this email' }, 409);
    }

    const { data: existingMember } = await supaAdmin
      .from('business_members')
      .select('id')
      .eq('business_id', businessId)
      .in('user_id', [
        supaAdmin.from('profiles').select('id').eq('email', email)
      ])
      .single();

    if (existingMember) {
      return json({ error: 'User is already a member of this business' }, 409);
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

    const { data: invite, error: inviteError } = await supaAdmin
      .from('invites')
      .insert({
        business_id: businessId,
        email,
        role: 'worker',
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        invited_by: userId,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Failed to create invite:', inviteError);
      return json({ error: 'Failed to create invite' }, 500);
    }

    // Generate invitation URL and send email
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:8080';
    const inviteUrl = `${frontendUrl}/invite?token=${token}`;
    
    // Build professional email using template
    const emailContent = buildInviteEmail({
      businessName: business.name,
      businessLogoUrl: business.logo_url,
      inviterName: inviter?.full_name || inviter?.email || 'Team Administrator',
      inviteeEmail: email,
      inviteUrl,
      role: 'worker',
      expiresAt: expiresAt.toISOString()
    });
    
    // Send invitation email directly using Resend
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    
    const emailResponse = await resend.emails.send({
      from: `${business.name} <${fromEmail}>`,
      to: [email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (emailResponse.error) {
      console.error('Failed to send invitation email:', emailResponse.error);
      return json({ error: 'Failed to send invitation email' }, 500);
    }

    console.log('Invitation email sent successfully:', emailResponse.data?.id);

    // Log audit action
    await supaAdmin.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: userId,
      p_action: 'invite_sent',
      p_resource_type: 'business_member',
      p_resource_id: invite.id,
      p_details: { email, role: 'worker' }
    });

    console.log('Invitation created successfully');

    return json({
      success: true,
      message: 'Invitation sent successfully',
      invite_id: invite.id,
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});
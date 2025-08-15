import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

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

    // Get business details
    const { data: business, error: businessError } = await supaAdmin
      .from('businesses')
      .select('id, name, logo_url')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return json({ error: 'Business not found or not owned by user' }, 403);
    }

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

    // Send invitation email
    const inviteUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/v1', '')}/invite?token=${token}`;
    
    try {
      await supaAdmin.functions.invoke('resend-send-email', {
        body: {
          to: email,
          subject: `You're invited to join ${business.name}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                ${business.logo_url ? `<img src="${business.logo_url}" alt="${business.name}" style="max-height: 60px; margin-bottom: 20px;">` : ''}
                <h1 style="color: #333; margin: 0;">You're invited to join ${business.name}</h1>
              </div>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                You've been invited to join <strong>${business.name}</strong> as a team member.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" 
                   style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #888; font-size: 14px;">
                This invitation will expire in 7 days. If you don't have an account, you'll be able to create one.
              </p>
              
              <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          `,
        },
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails, invitation is still created
    }

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
      message: 'Invitation sent successfully',
      invite_id: invite.id,
      invite_url: inviteUrl,
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});
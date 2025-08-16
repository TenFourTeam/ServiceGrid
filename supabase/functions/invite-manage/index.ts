import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, supaAdmin } = await requireCtx(req);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');
      const businessId = url.searchParams.get('business_id');

      if (action === 'list' && businessId) {
        // Verify user is owner of the business
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

        // Get pending invites
        const { data: invites, error } = await supaAdmin
          .from('invites')
          .select(`
            id,
            email,
            role,
            expires_at,
            created_at,
            invited_by,
            profiles:invited_by (email)
          `)
          .eq('business_id', businessId)
          .is('redeemed_at', null)
          .is('revoked_at', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching invites:', error);
          return json({ error: 'Failed to fetch invites' }, 500);
        }

        return json({ invites: invites || [] });
      }

      return json({ error: 'Invalid action or missing parameters' }, 400);
    }

    if (req.method === 'POST') {
      const { inviteId, action } = await req.json();

      if (!inviteId || !action) {
        return json({ error: 'Invite ID and action are required' }, 400);
      }

      // Get the invite and verify permissions
      const { data: invite, error: inviteError } = await supaAdmin
        .from('invites')
        .select('*, businesses!inner(name, logo_url)')
        .eq('id', inviteId)
        .single();

      if (inviteError || !invite) {
        return json({ error: 'Invite not found' }, 404);
      }

      // Verify user can manage this business
      const { data: membership } = await supaAdmin
        .from('business_members')
        .select('role')
        .eq('business_id', invite.business_id)
        .eq('user_id', userId)
        .eq('role', 'owner')
        .single();

      if (!membership) {
        return json({ error: 'Not authorized to manage this business' }, 403);
      }

      if (action === 'revoke') {
        const { error } = await supaAdmin
          .from('invites')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', inviteId);

        if (error) {
          console.error('Error revoking invite:', error);
          return json({ error: 'Failed to revoke invite' }, 500);
        }

        // Log audit action
        await supaAdmin.rpc('log_audit_action', {
          p_business_id: invite.business_id,
          p_user_id: userId,
          p_action: 'invite_revoked',
          p_resource_type: 'business_member',
          p_resource_id: inviteId,
          p_details: { email: invite.email }
        });

        return json({ message: 'Invite revoked successfully' });
      }

      if (action === 'resend') {
        // Generate new token and extend expiry
        const token = crypto.randomUUID();
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

        const { error } = await supaAdmin
          .from('invites')
          .update({
            token_hash: tokenHash,
            expires_at: newExpiresAt.toISOString(),
          })
          .eq('id', inviteId);

        if (error) {
          console.error('Error updating invite:', error);
          return json({ error: 'Failed to update invite' }, 500);
        }

        // Send new invitation email
        const frontendUrl = 'https://lovable.dev/projects/f4772f86-29e7-457f-b6ca-38196d888422';
        const inviteUrl = `${frontendUrl}/invite?token=${token}`;
        const business = invite.businesses;

        try {
          await supaAdmin.functions.invoke('resend-send-email', {
            body: {
              to: invite.email,
              subject: `Reminder: You're invited to join ${business.name}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    ${business.logo_url ? `<img src="${business.logo_url}" alt="${business.name}" style="max-height: 60px; margin-bottom: 20px;">` : ''}
                    <h1 style="color: #333; margin: 0;">Reminder: You're invited to join ${business.name}</h1>
                  </div>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.5;">
                    This is a reminder that you've been invited to join <strong>${business.name}</strong> as a team member.
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
        }

        // Log audit action
        await supaAdmin.rpc('log_audit_action', {
          p_business_id: invite.business_id,
          p_user_id: userId,
          p_action: 'invite_resent',
          p_resource_type: 'business_member',
          p_resource_id: inviteId,
          p_details: { email: invite.email }
        });

        return json({ 
          message: 'Invite resent successfully',
          invite_url: inviteUrl
        });
      }

      return json({ error: 'Invalid action' }, 400);
    }

    return json({ error: 'Method not allowed' }, 405);

  } catch (error) {
    console.error('Error in invite management:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});
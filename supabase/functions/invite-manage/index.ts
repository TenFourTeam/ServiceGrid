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
          return json({ error: 'Not authorized to manage this business' }, { status: 403 });
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
            profiles!invites_invited_by_fkey (email)
          `)
          .eq('business_id', businessId)
          .is('redeemed_at', null)
          .is('revoked_at', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching invites:', error);
          return json({ error: 'Failed to fetch invites' }, { status: 500 });
        }

        return json({ invites: invites || [] });
      }

      return json({ error: 'Invalid action or missing parameters' }, { status: 400 });
    }

    if (req.method === 'POST') {
      const { inviteId, action } = await req.json();

      if (!inviteId || !action) {
        return json({ error: 'Invite ID and action are required' }, { status: 400 });
      }

      // Get the invite and verify permissions
      const { data: invite, error: inviteError } = await supaAdmin
        .from('invites')
        .select('*, businesses!inner(name, logo_url)')
        .eq('id', inviteId)
        .single();

      if (inviteError || !invite) {
        return json({ error: 'Invite not found' }, { status: 404 });
      }

      // Verify user can manage this business
      const { data: membership } = await supaAdmin
        .from('business_members')
        .select('role')
        .eq('business_id', (invite as any).business_id)
        .eq('user_id', userId)
        .eq('role', 'owner')
        .single();

      if (!membership) {
        return json({ error: 'Not authorized to manage this business' }, { status: 403 });
      }

      if (action === 'revoke') {
        const { error } = await supaAdmin
          .from('invites')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', inviteId);

        if (error) {
          console.error('Error revoking invite:', error);
          return json({ error: 'Failed to revoke invite' }, { status: 500 });
        }

        // Log audit action
        await supaAdmin.rpc('log_audit_action', {
          p_business_id: (invite as any).business_id,
          p_user_id: userId,
          p_action: 'invite_revoked',
          p_resource_type: 'business_member',
          p_resource_id: inviteId,
          p_details: { email: (invite as any).email }
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
          return json({ error: 'Failed to update invite' }, { status: 500 });
        }

        // Log audit action
        await supaAdmin.rpc('log_audit_action', {
          p_business_id: (invite as any).business_id,
          p_user_id: userId,
          p_action: 'invite_resent',
          p_resource_type: 'business_member',
          p_resource_id: inviteId,
          p_details: { email: (invite as any).email }
        });

        return json({ 
          message: 'Invite resent successfully'
        });
      }

      return json({ error: 'Invalid action' }, { status: 400 });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('Error in invite management:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
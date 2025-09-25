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

    console.log('Declining invite for user:', userId, 'invite:', inviteId);

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

    // Mark invite as revoked (declined)
    const { error: declineError } = await supaAdmin
      .from('invites')
      .update({
        revoked_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (declineError) {
      console.error('Failed to decline invite:', declineError);
      return json({ error: 'Failed to decline invitation' }, { status: 500 });
    }

    // Log audit action
    await supaAdmin.rpc('log_audit_action', {
      p_business_id: invite.business_id,
      p_user_id: userId,
      p_action: 'invite_declined',
      p_resource_type: 'business_member',
      p_resource_id: userId,
      p_details: { email: invite.email, role: invite.role }
    });

    console.log('Invite declined successfully');

    return json({
      message: 'Invitation declined successfully',
    });

  } catch (error) {
    console.error('Error declining invite:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
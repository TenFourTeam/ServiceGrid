import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[decline-invite] ${req.method} request received`);
    
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const ctx = await requireCtx(req);
    console.log('[decline-invite] User context:', ctx);

    let body;
    try {
      body = await req.json();
      if (!body) {
        throw new Error('Request body is empty');
      }
    } catch (jsonError) {
      console.error('[decline-invite] JSON parsing error:', jsonError);
      return json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { inviteId } = body;

    if (!inviteId) {
      return json({ error: 'Invite ID is required' }, { status: 400 });
    }

    console.log('[decline-invite] Declining invite:', inviteId, 'for user:', ctx.clerkUserId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's profile to verify they can decline this invite
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('clerk_user_id', ctx.clerkUserId)
      .single();

    if (profileError || !profile) {
      console.error('[decline-invite] Profile error:', profileError);
      return json({ error: 'User profile not found' }, { status: 404 });
    }

    // Verify the invite exists and belongs to this user
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, email, redeemed_at, revoked_at')
      .eq('id', inviteId)
      .eq('email', profile.email)
      .single();

    if (inviteError || !invite) {
      console.error('[decline-invite] Invite not found:', inviteError);
      return json({ error: 'Invite not found or not accessible' }, { status: 404 });
    }

    // Check if invite is already processed
    if (invite.redeemed_at) {
      return json({ error: 'Invite has already been accepted' }, { status: 400 });
    }

    if (invite.revoked_at) {
      return json({ error: 'Invite has already been declined' }, { status: 400 });
    }

    // Mark the invite as revoked (declined)
    const { data: updatedInvite, error: updateError } = await supabase
      .from('invites')
      .update({ 
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', inviteId)
      .select()
      .single();

    if (updateError) {
      console.error('[decline-invite] Update error:', updateError);
      throw new Error(`Failed to decline invite: ${updateError.message}`);
    }

    console.log('[decline-invite] Successfully declined invite:', inviteId);
    return json({ 
      message: 'Invite declined successfully',
      invite: updatedInvite
    });

  } catch (error: any) {
    console.error('[decline-invite] Error:', error);
    return json(
      { error: error.message || 'Failed to decline invite' },
      { status: 500 }
    );
  }
});
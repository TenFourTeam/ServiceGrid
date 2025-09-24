import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return json({ error: 'Token is required' }, { status: 400 });
    }

    // Create admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Hash the token to find the invite
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('Looking up invite with token hash');

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      console.log('Invite not found or invalid:', inviteError);
      return json({ error: 'Invalid or expired invite' }, { status: 400 });
    }

    // Get authenticated user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Create client with user token
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Invalid authentication' }, { status: 401 });
    }

    console.log('Redeeming invite for user:', user.id);

    // Check if user profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    // Create profile if it doesn't exist
    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || invite.email,
          clerk_user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        return json({ error: 'Failed to create user profile' }, { status: 500 });
      }

      console.log('User profile created for:', user.id);
    } else {
      console.log('User profile already exists for:', user.id);
    }

    // Check if user is already a member of this business
    const { data: existingMember } = await supabase
      .from('business_members')
      .select('*')
      .eq('business_id', invite.business_id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      // Mark invite as redeemed even though user was already a member
      await supabase
        .from('invites')
        .update({
          redeemed_at: new Date().toISOString(),
          redeemed_by: user.id,
        })
        .eq('id', invite.id);

      return json({ message: 'You are already a member of this business' });
    }

    // Add user to business members with invite tracking
    const { error: memberError } = await supabase
      .from('business_members')
      .insert({
        business_id: invite.business_id,
        user_id: user.id,
        role: invite.role,
        invited_by: invite.invited_by,
        joined_at: new Date().toISOString(),
        joined_via_invite: true, // Mark as joined through invite
      });

    if (memberError) {
      console.error('Failed to add business member:', memberError);
      return json({ error: 'Failed to join business' }, { status: 500 });
    }

    // Mark invite as redeemed
    const { error: redeemError } = await supabase
      .from('invites')
      .update({
        redeemed_at: new Date().toISOString(),
        redeemed_by: user.id,
      })
      .eq('id', invite.id);

    if (redeemError) {
      console.error('Failed to mark invite as redeemed:', redeemError);
    }

    // Log audit action
    await supabase.rpc('log_audit_action', {
      p_business_id: invite.business_id,
      p_user_id: user.id,
      p_action: 'invite_redeemed',
      p_resource_type: 'business_member',
      p_resource_id: user.id,
      p_details: { email: invite.email, role: invite.role }
    });

    console.log('Invite redeemed successfully');

    return json({
      message: 'Successfully joined the business',
      business_id: invite.business_id,
      role: invite.role,
    });

  } catch (error) {
    console.error('Error redeeming invite:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
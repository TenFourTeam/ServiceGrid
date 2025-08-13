import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...init.headers },
  });

const createAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

async function resolveOwnerIdFromClerk(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
  if (!clerkSecretKey) throw new Error('CLERK_SECRET_KEY not configured');

  const payload = await verifyToken(token, { secretKey: clerkSecretKey });
  const supabase = createAdminClient();

  // First try to find by clerk_user_id
  let { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', payload.sub)
    .single();

  if (!profile && payload.email) {
    // Fallback to email lookup
    ({ data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', payload.email)
      .single());
  }

  if (!profile) {
    throw new Error('User profile not found');
  }

  return profile.id;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const ownerId = await resolveOwnerIdFromClerk(req);
    const supabase = createAdminClient();
    const { businessId, email } = await req.json();

    if (!businessId || !email) {
      return json({ error: 'businessId and email are required' }, { status: 400 });
    }

    // Verify the user is an owner of this business
    const { data: membership } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', ownerId)
      .single();

    if (!membership || membership.role !== 'owner') {
      return json({ error: 'Only business owners can invite workers' }, { status: 403 });
    }

    const emailLower = email.toLowerCase();

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from('invites')
      .select('*')
      .eq('business_id', businessId)
      .eq('email', emailLower)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvite) {
      return json({ error: 'An active invitation already exists for this email' }, { status: 400 });
    }

    // Check if user already exists and is a member
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(emailLower);
    
    if (existingUser.user) {
      const { data: existingMember } = await supabase
        .from('business_members')
        .select('*')
        .eq('business_id', businessId)
        .eq('user_id', existingUser.user.id)
        .single();

      if (existingMember) {
        return json({ error: 'User is already a member of this business' }, { status: 400 });
      }
    }

    // Generate secure token
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...tokenBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Hash the token for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        business_id: businessId,
        email: emailLower,
        role: 'worker',
        token_hash: tokenHash,
        expires_at: expiresAt,
        invited_by: ownerId,
      })
      .select('id')
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Get business info for email
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    // Generate invite URL
    const inviteUrl = `${Deno.env.get('ALLOWED_ORIGINS')?.split(',')[0] || 'http://localhost:8080'}/invite?token=${token}`;
    
    // Send invitation email
    try {
      await supabase.functions.invoke('resend-send-email', {
        body: {
          to: emailLower,
          subject: `You're invited to join ${business?.name || 'the team'}`,
          html: `
            <h1>You're invited!</h1>
            <p>You've been invited to join ${business?.name || 'a business'} on ServiceGrid.</p>
            <p><a href="${inviteUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          `,
        },
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails
    }

    // Log audit action
    await supabase.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: ownerId,
      p_action: 'invite_created',
      p_resource_type: 'invite',
      p_resource_id: invite.id,
      p_details: { email: emailLower, role: 'worker' }
    });

    return json({ 
      message: 'Invitation sent successfully',
      inviteId: invite.id,
      inviteUrl: inviteUrl
    });

  } catch (error) {
    console.error('Invite worker error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
});
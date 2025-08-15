import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

async function resolveOwnerIdFromClerk(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  const token = authHeader.replace('Bearer ', '');
  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
  if (!clerkSecretKey) {
    throw new Error('CLERK_SECRET_KEY not configured');
  }

  // Verify the Clerk JWT
  const clerkResponse = await fetch('https://api.clerk.com/v1/jwts/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!clerkResponse.ok) {
    throw new Error('Invalid Clerk token');
  }

  const { payload } = await clerkResponse.json();
  const clerkUserId = payload.sub;

  // Get the Supabase profile
  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error || !profile) {
    // Fallback to email lookup
    const email = payload.email;
    if (email) {
      const { data: emailProfile, error: emailError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (emailError || !emailProfile) {
        throw new Error('Profile not found');
      }
      return emailProfile.id;
    }
    throw new Error('Profile not found');
  }

  return profile.id;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const ownerId = await resolveOwnerIdFromClerk(req);
    const { businessId, email } = await req.json();

    if (!businessId || !email) {
      return json({ error: 'Business ID and email are required' }, 400);
    }

    const supabase = createAdminClient();

    // Verify the user owns this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, logo_url')
      .eq('id', businessId)
      .eq('owner_id', ownerId)
      .single();

    if (businessError || !business) {
      return json({ error: 'Business not found or not owned by user' }, 403);
    }

    // Check for existing invite or membership
    const { data: existingInvite } = await supabase
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

    const { data: existingMember } = await supabase
      .from('business_members')
      .select('id')
      .eq('business_id', businessId)
      .in('user_id', [
        supabase.from('profiles').select('id').eq('email', email)
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

    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        business_id: businessId,
        email,
        role: 'worker',
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        invited_by: ownerId,
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
      await supabase.functions.invoke('resend-send-email', {
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
    await supabase.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: ownerId,
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
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

async function resolveUserIdFromClerk(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7);
  
  try {
    const clerkResponse = await fetch(`https://api.clerk.com/v1/tokens/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('CLERK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!clerkResponse.ok) {
      throw new Error(`Clerk verification failed: ${clerkResponse.status}`);
    }

    const { sub: clerkUserId } = await clerkResponse.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    let { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error && error.code === 'PGRST116') {
      const clerkUserResponse = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        headers: { 'Authorization': `Bearer ${Deno.env.get('CLERK_SECRET_KEY')}` },
      });

      if (clerkUserResponse.ok) {
        const clerkUser = await clerkUserResponse.json();
        const primaryEmail = clerkUser.email_addresses?.find((e: any) => e.id === clerkUser.primary_email_address_id)?.email_address;
        
        if (primaryEmail) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', primaryEmail.toLowerCase())
            .single();
          
          if (profileByEmail) {
            profile = profileByEmail;
          }
        }
      }
    }

    if (!profile) {
      throw new Error('User profile not found');
    }

    return profile.id;
  } catch (error) {
    console.error('Auth error:', error);
    throw new Error('Authentication failed');
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userId = await resolveUserIdFromClerk(req);
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    if (req.method === 'GET' && action === 'list') {
      const businessId = url.searchParams.get('business_id');
      if (!businessId) {
        return json({ error: 'business_id is required' }, 400);
      }

      // Verify user can manage this business
      const { data: canManage } = await supabase.rpc('can_manage_business', { p_business_id: businessId });
      if (!canManage) {
        return json({ error: 'Unauthorized' }, 403);
      }

      // Get pending invites
      const { data: invites, error } = await supabase
        .from('invites')
        .select(`
          id,
          email,
          role,
          expires_at,
          created_at,
          invited_by,
          profiles!invites_invited_by_fkey(email)
        `)
        .eq('business_id', businessId)
        .is('redeemed_at', null)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invites:', error);
        return json({ error: 'Failed to fetch invites' }, 500);
      }

      return json({ invites });
    }

    if (req.method === 'POST') {
      const { inviteId, action: bodyAction } = await req.json();

      if (!inviteId || !bodyAction) {
        return json({ error: 'inviteId and action are required' }, 400);
      }

      // Get the invite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (inviteError || !invite) {
        return json({ error: 'Invite not found' }, 404);
      }

      // Verify user can manage this business
      const { data: canManage } = await supabase.rpc('can_manage_business', { p_business_id: invite.business_id });
      if (!canManage) {
        return json({ error: 'Unauthorized' }, 403);
      }

      if (bodyAction === 'revoke') {
        const { error } = await supabase
          .from('invites')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', inviteId);

        if (error) {
          console.error('Error revoking invite:', error);
          return json({ error: 'Failed to revoke invite' }, 500);
        }

        // Log audit action
        await supabase.rpc('log_audit_action', {
          p_business_id: invite.business_id,
          p_user_id: userId,
          p_action: 'invite_revoked',
          p_resource_type: 'invite',
          p_resource_id: inviteId,
          p_details: { email: invite.email }
        });

        return json({ message: 'Invite revoked successfully' });
      }

      if (bodyAction === 'resend') {
        // Generate new token and update invite
        const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
        const token = btoa(String.fromCharCode(...tokenBytes))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabase
          .from('invites')
          .update({
            token_hash: tokenHash,
            expires_at: newExpiresAt,
          })
          .eq('id', inviteId);

        if (error) {
          console.error('Error updating invite:', error);
          return json({ error: 'Failed to resend invite' }, 500);
        }

        // Get business info for email
        const { data: business } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', invite.business_id)
          .single();

        // Send email via resend function
        const inviteUrl = `${Deno.env.get('ALLOWED_ORIGINS')?.split(',')[0] || 'http://localhost:8080'}/invite?token=${token}`;
        
        try {
          await supabase.functions.invoke('resend-send-email', {
            body: {
              to: invite.email,
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
          console.error('Failed to send email:', emailError);
          // Don't fail the request if email fails
        }

        // Log audit action
        await supabase.rpc('log_audit_action', {
          p_business_id: invite.business_id,
          p_user_id: userId,
          p_action: 'invite_resent',
          p_resource_type: 'invite',
          p_resource_id: inviteId,
          p_details: { email: invite.email }
        });

        return json({ message: 'Invite resent successfully' });
      }

      return json({ error: 'Invalid action' }, 400);
    }

    return json({ error: 'Method not allowed' }, 405);

  } catch (error) {
    console.error('Error in invite-manage:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
});
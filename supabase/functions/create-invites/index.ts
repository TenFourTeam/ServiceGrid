import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface CreateInvitesRequest {
  userIds: string[];
  businessId: string;
  role?: 'worker' | 'owner';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Require authentication context
    const ctx = await requireCtx(req);
    console.log('[create-invites] Request context:', ctx);

    // Parse request body
    const { userIds, businessId, role = 'worker' }: CreateInvitesRequest = await req.json();
    console.log('[create-invites] Creating invites:', { userIds, businessId, role });

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: 'userIds array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!businessId) {
      return new Response(JSON.stringify({ error: 'businessId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the requesting user is an owner of the business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('[create-invites] Business not found:', businessError);
      return new Response(JSON.stringify({ error: 'Business not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (business.owner_id !== ctx.userId) {
      console.error('[create-invites] User not authorized to invite to this business');
      return new Response(JSON.stringify({ error: 'Not authorized to invite users to this business' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user emails for the provided user IDs
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    if (usersError) {
      console.error('[create-invites] Error fetching users:', usersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch user information' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid users found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch existing accepted invites and pending invites to avoid duplicates
    const { data: acceptedInvites, error: acceptedError } = await supabase
      .from('invites')
      .select('email')
      .eq('business_id', businessId)
      .not('accepted_at', 'is', null)
      .is('revoked_at', null);

    if (acceptedError) {
      console.error('[create-invites] Error fetching accepted invites:', acceptedError);
    }

    const { data: pendingInvites, error: pendingError } = await supabase
      .from('invites')
      .select('email')
      .eq('business_id', businessId)
      .is('accepted_at', null)
      .is('revoked_at', null);

    if (pendingError) {
      console.error('[create-invites] Error fetching pending invites:', pendingError);
    }

    // Filter users to avoid duplicates
    const acceptedInviteEmails = new Set((acceptedInvites || []).map(i => i.email));
    const pendingInviteEmails = new Set((pendingInvites || []).map(i => i.email));
    
    const eligibleUsers = users?.filter(user => 
      user.id !== business.owner_id && // Don't invite the business owner
      !acceptedInviteEmails.has(user.email) && // Don't invite users with accepted invites
      !pendingInviteEmails.has(user.email) // Don't invite users with pending invites
    ) || [];

    if (eligibleUsers.length === 0) {
      return new Response(JSON.stringify({ error: 'All users either have accepted invites, pending invites, or are the business owner' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create invites for the eligible users
    const invitePromises = eligibleUsers.map(async (user) => {
      const tokenHash = crypto.randomUUID();
      
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .insert({
          business_id: businessId,
          email: user.email,
          role: role,
          invited_by: ctx.userId,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (inviteError) {
        console.error('[create-invites] Error creating invite for user:', user.email, inviteError);
        throw inviteError;
      }

      console.log('[create-invites] Created invite for user:', user.email);
      return invite;
    });

    const invites = await Promise.all(invitePromises);

    // Log audit action
    await supabase.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: ctx.userId,
      p_action: 'create_invites',
      p_resource_type: 'invite',
      p_details: { 
        invited_users: eligibleUsers.map(u => u.email),
        role: role,
        invite_count: invites.length
      }
    });

    return new Response(JSON.stringify({
      message: `Successfully created ${invites.length} invite(s)`,
      invites: invites.map(i => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expires_at: i.expires_at
      })),
      skipped: {
        existing_members: acceptedInviteEmails.size + 1, // +1 for business owner
        pending_invites: pendingInviteEmails.size
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[create-invites] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create invites' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
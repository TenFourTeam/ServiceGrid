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

    // Check which users already have permissions or pending invites
    const { data: existingPermissions, error: permissionsError } = await supabase
      .from('business_permissions')
      .select('user_id')
      .eq('business_id', businessId)
      .in('user_id', userIds);

    if (permissionsError) {
      console.error('[create-invites] Error checking existing permissions:', permissionsError);
      return json({ error: 'Failed to check existing permissions' }, { status: 500, headers: corsHeaders });
    }

    const { data: pendingInvites, error: invitesError } = await supabase
      .from('invites')
      .select('invited_user_id')
      .eq('business_id', businessId)
      .in('invited_user_id', userIds)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (invitesError) {
      console.error('[create-invites] Error checking pending invites:', invitesError);
      return json({ error: 'Failed to check pending invites' }, { status: 500, headers: corsHeaders });
    }

    const existingUserIds = new Set(existingPermissions?.map(p => p.user_id) || []);
    const pendingUserIds = new Set(pendingInvites?.map(i => i.invited_user_id) || []);
    
    // Filter out users who already have permissions or pending invites
    const eligibleUserIds = userIds.filter(userId => 
      !existingUserIds.has(userId) && !pendingUserIds.has(userId)
    );

    if (eligibleUserIds.length === 0) {
      return json({
        message: 'No new invites to create',
        invites: [],
        skipped: {
          existing_members: existingUserIds.size,
          pending_invites: pendingUserIds.size
        }
      }, { headers: corsHeaders });
    }

    // Get user profiles for the invites
    const { data: userProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', eligibleUserIds);

    if (profilesError) {
      console.error('[create-invites] Error fetching user profiles:', profilesError);
      return json({ error: 'Failed to fetch user profiles' }, { status: 500, headers: corsHeaders });
    }

    // Create invites
    const invitesToCreate = eligibleUserIds.map(userId => ({
      business_id: businessId,
      invited_user_id: userId,
      role: role,
      invited_by: ctx.userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    }));

    const { data: createdInvites, error: createError } = await supabase
      .from('invites')
      .insert(invitesToCreate)
      .select();

    if (createError) {
      console.error('[create-invites] Error creating invites:', createError);
      return json({ error: 'Failed to create invites' }, { status: 500, headers: corsHeaders });
    }

    // Log audit action
    await supabase.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: ctx.userId,
      p_action: 'create_invites',
      p_resource_type: 'invite',
      p_details: { 
        invited_users: userProfiles?.map(u => u.email) || [],
        role: role,
        invite_count: createdInvites?.length || 0
      }
    });

    // Return created invites with email info
    const invitesWithEmails = createdInvites?.map(invite => {
      const profile = userProfiles?.find(p => p.id === invite.invited_user_id);
      return {
        id: invite.id,
        email: profile?.email || 'Unknown',
        role: invite.role,
        expires_at: invite.expires_at
      };
    }) || [];

    return json({
      message: `Successfully created ${invitesWithEmails.length} invites`,
      invites: invitesWithEmails,
      skipped: {
        existing_members: existingUserIds.size,
        pending_invites: pendingUserIds.size
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('[create-invites] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to create invites' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
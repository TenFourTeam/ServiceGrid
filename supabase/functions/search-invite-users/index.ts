import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  console.log(`[search-invite-users] ===== Function Entry =====`);
  console.log(`[search-invite-users] ${req.method} request to ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log('[search-invite-users] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    console.log('[search-invite-users] Method not allowed:', req.method);
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    console.log('[search-invite-users] Starting authentication context resolution...');
    const ctx = await requireCtx(req);
    console.log('[search-invite-users] Context resolved successfully:', {
      userId: ctx.userId,
      businessId: ctx.businessId,
      email: ctx.email
    });

    // Get query parameters
    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId') || ctx.businessId;
    const searchQuery = url.searchParams.get('search') || '';
    
    if (!businessId) {
      console.error('[search-invite-users] Missing businessId parameter');
      return json({ error: 'businessId parameter is required' }, { status: 400 });
    }

    console.log('[search-invite-users] Search parameters:', { businessId, searchQuery });

    // Use service role client from context
    const supabase = ctx.supaAdmin;

    // Check if user is business owner
    console.log('[search-invite-users] Checking user business membership...');
    const { data: membership, error: membershipError } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', ctx.userId)
      .single();
    
    if (membershipError) {
      console.error('[search-invite-users] Membership check error:', membershipError);
      return json({ error: 'Failed to verify business membership' }, { status: 500 });
    }

    if (!membership || membership.role !== 'owner') {
      console.error('[search-invite-users] Permission denied. User role:', membership?.role || 'none');
      return json({ error: 'Only business owners can search for users to invite' }, { status: 403 });
    }

    console.log('[search-invite-users] Permission check passed. User is business owner.');

    // Build the query to get users that are NOT already members of this business
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name
      `)
      .neq('id', ctx.userId); // Exclude current user

    // Add search filtering if provided
    if (searchQuery.trim()) {
      query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
    }

    console.log('[search-invite-users] Fetching all profiles with search filter...');
    const { data: allUsers, error: profilesError } = await query.order('email');

    if (profilesError) {
      console.error('[search-invite-users] Profiles fetch error:', profilesError);
      return json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    console.log(`[search-invite-users] Found ${allUsers?.length || 0} profiles matching search criteria`);

    // Get existing business members to filter out
    console.log('[search-invite-users] Fetching existing business members...');
    const { data: existingMembers, error: membersError } = await supabase
      .from('business_members')
      .select('user_id')
      .eq('business_id', businessId);

    if (membersError) {
      console.error('[search-invite-users] Business members fetch error:', membersError);
      return json({ error: 'Failed to fetch business members' }, { status: 500 });
    }

    // Get pending invites to filter out
    console.log('[search-invite-users] Fetching pending invites...');
    const { data: pendingInvites, error: invitesError } = await supabase
      .from('invites')
      .select('id')
      .eq('business_id', businessId)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (invitesError) {
      console.error('[search-invite-users] Pending invites fetch error:', invitesError);
      return json({ error: 'Failed to fetch pending invites' }, { status: 500 });
    }

    // Create sets for efficient filtering
    const existingMemberIds = new Set(existingMembers?.map((m: any) => m.user_id) || []);
    const pendingInviteIds = new Set(pendingInvites?.map((i: any) => i.id) || []);

    // Filter out existing members and users with pending invites
    const availableUsers = (allUsers || []).filter((user: any) => {
      const isExistingMember = existingMemberIds.has(user.id);
      const hasPendingInvite = pendingInviteIds.has(user.id);
      
      console.log(`[search-invite-users] User ${user.email} - existing member: ${isExistingMember}, pending invite: ${hasPendingInvite}`);
      
      return !isExistingMember && !hasPendingInvite;
    });

    console.log(`[search-invite-users] Filtered to ${availableUsers.length} available users for invitation`);
    console.log(`[search-invite-users] Available users:`, availableUsers.map((u: any) => u.email));

    return json({ 
      users: availableUsers,
      metadata: {
        totalProfiles: allUsers?.length || 0,
        existingMembers: existingMembers?.length || 0,
        pendingInvites: pendingInvites?.length || 0,
        availableForInvite: availableUsers.length,
        searchQuery: searchQuery || null
      }
    });

  } catch (error: any) {
    console.error('[search-invite-users] Unexpected error:', error);
    return json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
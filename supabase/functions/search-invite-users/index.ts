import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    // Check if user is business owner
    console.log('[search-invite-users] Checking business ownership...');
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();
    
    if (businessError) {
      console.error('[search-invite-users] Business check error:', businessError);
      return json({ error: 'Failed to verify business ownership' }, { status: 500 });
    }

    if (!business || business.owner_id !== ctx.userId) {
      console.error('[search-invite-users] Permission denied. User is not business owner');
      return json({ error: 'Only business owners can search for users to invite' }, { status: 403 });
    }

    console.log('[search-invite-users] Permission check passed. User is business owner.');

    // Get all profiles (excluding the current user)
    let profileQuery = supabase
      .from('profiles')
      .select('id, email, full_name')
      .not('id', 'eq', ctx.userId);

    // Apply search filter if provided
    if (searchQuery) {
      profileQuery = profileQuery.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
    }

    console.log('[search-invite-users] Fetching profiles...');
    const { data: allProfiles, error: profilesError } = await profileQuery;

    if (profilesError) {
      console.error('[search-invite-users] Profiles fetch error:', profilesError);
      return json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    console.log(`[search-invite-users] Found ${allProfiles?.length || 0} profiles matching search criteria`);

    // Get businesses owned by these users
    console.log('[search-invite-users] Fetching businesses owned by profiles...');
    const profileIds = (allProfiles || []).map(p => p.id);
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .in('owner_id', profileIds);

    if (businessesError) {
      console.error('[search-invite-users] Business fetch error:', businessesError);
      return json({ error: 'Failed to fetch businesses' }, { status: 500 });
    }

    // Filter to only include users who own businesses
    const businessOwnerIds = new Set((businesses || []).map(b => b.owner_id));
    const allUsers = (allProfiles || []).filter(profile => businessOwnerIds.has(profile.id));

    console.log(`[search-invite-users] Found ${allUsers?.length || 0} profiles matching search criteria`);

    // Get users who already have permissions to this business
    console.log('[search-invite-users] Fetching existing business permissions...');
    const { data: existingPermissions, error: permissionsError } = await supabase
      .from('business_permissions')
      .select('user_id')
      .eq('business_id', businessId);

    if (permissionsError) {
      console.error('[search-invite-users] Error fetching existing permissions:', permissionsError);
      return json({ error: 'Failed to check existing permissions' }, { status: 500, headers: corsHeaders });
    }

    const existingUserIds = new Set(existingPermissions?.map(p => p.user_id) || []);

    // Get users with pending invites
    console.log('[search-invite-users] Fetching pending invites...');
    const { data: pendingInvites, error: invitesError } = await supabase
      .from('invites')
      .select('invited_user_id')
      .eq('business_id', businessId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (invitesError) {
      console.error('[search-invite-users] Pending invites fetch error:', invitesError);
      return json({ error: 'Failed to fetch pending invites' }, { status: 500 });
    }

    const pendingUserIds = new Set(pendingInvites?.map(i => i.invited_user_id) || []);

    // Filter out users who already have permissions or pending invites
    const availableUsers = (allUsers || [])
      .filter(profile => !existingUserIds.has(profile.id) && !pendingUserIds.has(profile.id))
      .map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name
      }));

    console.log(`[search-invite-users] Filtered to ${availableUsers.length} available users for invitation`);
    console.log(`[search-invite-users] Available users:`, availableUsers.map((u: any) => u.email));

    return json({
      users: availableUsers,
      metadata: {
        totalProfiles: allUsers?.length || 0,
        existingMembers: existingPermissions?.length || 0,
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
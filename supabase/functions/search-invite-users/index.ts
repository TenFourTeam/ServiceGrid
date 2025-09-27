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

    // Fetch users with accepted invites for this business
    console.log('[search-invite-users] Fetching users with accepted invites...');
    const { data: acceptedInvites, error: acceptedError } = await supabase
      .from('invites')
      .select('email')
      .eq('business_id', businessId)
      .not('accepted_at', 'is', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (acceptedError) {
      console.error('[search-invite-users] Error fetching accepted invites:', acceptedError);
      return json({ error: 'Failed to fetch accepted invites' }, { status: 500, headers: corsHeaders });
    }

    // Get pending invites to filter out
    console.log('[search-invite-users] Fetching pending invites...');
    const { data: pendingInvites, error: invitesError } = await supabase
      .from('invites')
      .select('email')
      .eq('business_id', businessId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (invitesError) {
      console.error('[search-invite-users] Pending invites fetch error:', invitesError);
      return json({ error: 'Failed to fetch pending invites' }, { status: 500 });
    }

    // Filter out the business owner and users with accepted invites or pending invites
    const acceptedInviteEmails = new Set((acceptedInvites || []).map((i: any) => i.email));
    const pendingInviteEmails = new Set((pendingInvites || []).map((i: any) => i.email));

    // Filter out existing members and users with pending invites
    const availableUsers = (allUsers || []).filter((user: any) => {
      const isOwner = user.id === business.owner_id;
      const hasAcceptedInvite = acceptedInviteEmails.has(user.email);
      const hasPendingInvite = pendingInviteEmails.has(user.email);
      
      console.log(`[search-invite-users] User ${user.email} - owner: ${isOwner}, accepted invite: ${hasAcceptedInvite}, pending invite: ${hasPendingInvite}`);
      
      return !isOwner && !hasAcceptedInvite && !hasPendingInvite;
    });

    console.log(`[search-invite-users] Filtered to ${availableUsers.length} available users for invitation`);
    console.log(`[search-invite-users] Available users:`, availableUsers.map((u: any) => u.email));

    return json({ 
      users: availableUsers,
      metadata: {
        totalProfiles: allUsers?.length || 0,
        existingMembers: 1 + (acceptedInvites?.length || 0), // Owner + accepted invites
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
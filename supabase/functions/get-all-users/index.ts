import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  console.log(`[get-all-users] ===== Function Entry =====`);
  console.log(`[get-all-users] ${req.method} request to ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log('[get-all-users] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    console.log('[get-all-users] Method not allowed:', req.method);
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    console.log('[get-all-users] Starting authentication context resolution...');
    const ctx = await requireCtx(req);
    console.log('[get-all-users] Context resolved successfully:', {
      userId: ctx.userId,
      businessId: ctx.businessId,
      email: ctx.email
    });

    // Use query parameter businessId if provided, otherwise use context businessId
    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId') || ctx.businessId;
    
    if (!businessId) {
      console.error('[get-all-users] Missing businessId parameter');
      return json({ error: 'businessId parameter is required' }, { status: 400 });
    }

    console.log('[get-all-users] Using businessId:', businessId);

    // Use service role client from context
    const supabase = ctx.supaAdmin;

    // Check if user is business owner - direct query instead of RPC
    console.log('[get-all-users] Checking user business membership...');
    const { data: membership, error: membershipError } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', ctx.userId)
      .single();
    
    if (membershipError) {
      console.error('[get-all-users] Membership check error:', membershipError);
      return json({ error: 'Failed to verify business membership' }, { status: 500 });
    }

    if (!membership || membership.role !== 'owner') {
      console.error('[get-all-users] Permission denied. User role:', membership?.role || 'none');
      return json({ error: 'Only business owners can view all users for invitations' }, { status: 403 });
    }

    console.log('[get-all-users] Permission check passed. User is business owner.');

    // Step 4: Get all profiles excluding current user and existing business members
    console.log('[get-all-users] Fetching available users for invitation...');
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .neq('id', ctx.userId) // Exclude current user
      .not('id', 'in', `(
        SELECT user_id 
        FROM business_members 
        WHERE business_id = '${businessId}'
      )`) // Exclude existing business members
      .order('email');

    if (error) {
      console.error('[get-all-users] Database error:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      return json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    console.log(`[get-all-users] Found ${users?.length || 0} available users for invitation`);

    return json({ users: users || [] });

  } catch (error: any) {
    console.error('[get-all-users] Unexpected error:', error);
    return json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
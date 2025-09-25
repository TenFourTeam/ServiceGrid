import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    // Step 1: Authentication context validation with detailed logging
    console.log('[get-all-users] Starting authentication context resolution...');
    const ctx = await requireCtx(req);
    console.log('[get-all-users] Raw context resolved:', JSON.stringify(ctx, null, 2));
    
    // Validate authentication context
    if (!ctx.userId || !ctx.businessId) {
      console.error('[get-all-users] Authentication context validation failed:', {
        hasUserId: !!ctx.userId,
        hasBusinessId: !!ctx.businessId,
        userId: ctx.userId,
        businessId: ctx.businessId
      });
      return json(
        { error: 'Authentication required: Missing user or business context' },
        { status: 401 }
      );
    }
    
    console.log('[get-all-users] Authentication validated successfully:', {
      userId: ctx.userId,
      businessId: ctx.businessId
    });

    // Step 2: Extract businessId from query parameters
    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId') || ctx.businessId;
    
    if (!businessId) {
      console.error('[get-all-users] Missing businessId parameter');
      return json({ error: 'businessId parameter is required' }, { status: 400 });
    }

    console.log('[get-all-users] Using businessId:', businessId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 3: Check if user is business owner (required for viewing all users)
    console.log('[get-all-users] Checking user business role...');
    const { data: userRole, error: roleError } = await supabase
      .rpc('user_business_role', { p_business_id: businessId });
    
    if (roleError) {
      console.error('[get-all-users] Role check error:', roleError);
      return json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    if (userRole !== 'owner') {
      console.error('[get-all-users] Permission denied. User role:', userRole);
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
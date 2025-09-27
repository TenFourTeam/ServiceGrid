import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[business-members] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[business-members] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
    // Fetch business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, owner_id, created_at')
      .eq('id', ctx.businessId)
      .single();

    if (businessError) {
      console.error('[business-members] Error fetching business:', businessError);
      return json({ error: 'Failed to fetch business details' }, { status: 500, headers: corsHeaders });
    }

    // Fetch owner profile separately
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('id, email, full_name, clerk_user_id')
      .eq('id', business.owner_id)
      .single();

    if (ownerError) {
      console.error('[business-members] Error fetching owner profile:', ownerError);
      return json({ error: 'Failed to fetch owner profile' }, { status: 500, headers: corsHeaders });
    }

    // Fetch workers (users with business permissions)
    const { data: businessPermissions, error: permissionsError } = await supabase
      .from('business_permissions')
      .select(`
        user_id,
        granted_at,
        granted_by,
        profiles!business_permissions_user_id_fkey(id, email, full_name)
      `)
      .eq('business_id', ctx.businessId);

    if (permissionsError) {
      console.error('[business-members] Error fetching business permissions:', permissionsError);
      return json({ error: 'Failed to fetch worker members' }, { status: 500, headers: corsHeaders });
    }

    // Combine owner and workers into a single members list
    const members = [
      // Owner member
      {
        id: `owner-${ownerProfile.id}`,
        business_id: ctx.businessId,
        user_id: ownerProfile.id,
        role: 'owner' as const,
        invited_at: null, // Owners aren't invited
        joined_at: null, // Owners don't "join"
        invited_by: null,
        joined_via_invite: false,
        email: ownerProfile.email,
        name: ownerProfile.full_name
      },
      // Worker members (from business permissions)
      ...(businessPermissions || []).map((permission: any) => ({
        id: `worker-${permission.profiles.id}`,
        business_id: business.id,
        user_id: permission.profiles.id,
        role: 'worker' as const,
        invited_at: null,
        joined_at: permission.granted_at,
        invited_by: permission.granted_by,
        joined_via_invite: true,
        email: permission.profiles.email,
        name: permission.profiles.full_name
      }))
    ];

      console.log('[business-members] Fetched', members.length, 'members (1 owner +', (businessPermissions?.length || 0), 'workers)');
      return json({ 
        data: members,
        count: members.length
      }, { headers: corsHeaders });
    }


    if (req.method === 'DELETE') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[business-members] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }

    const { memberId } = body;

    if (!memberId) {
      return json({ error: 'Member ID is required' }, { status: 400 });
    }

    console.log('[business-members] Starting member removal:', memberId);
    
    // Verify that the authenticated user is the owner of the business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', ctx.businessId)
      .single();

    if (businessError || !business) {
      console.error('[business-members] Error fetching business:', businessError);
      return json({ error: 'Business not found' }, { status: 404, headers: corsHeaders });
    }

    if (business.owner_id !== ctx.userId) {
      return json({ error: 'Only business owners can remove members' }, { status: 403, headers: corsHeaders });
    }

    // Extract user ID from memberId (format: "worker-{userId}")
    if (!memberId.startsWith('worker-')) {
      return json({ error: 'Cannot remove business owner' }, { status: 400, headers: corsHeaders });
    }
    
    const userId = memberId.replace('worker-', '');

    // Remove the business permission
    const { error: deleteError } = await supabase
      .from('business_permissions')
      .delete()
      .eq('business_id', ctx.businessId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[business-members] Error removing business permission:', deleteError);
      return json({ error: 'Failed to remove member' }, { status: 500, headers: corsHeaders });
    }

      console.log('[business-members] Member removed:', memberId);
      return json({ 
        message: 'Member removed successfully',
        data: { memberId }
      }, { headers: corsHeaders });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[business-members] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});
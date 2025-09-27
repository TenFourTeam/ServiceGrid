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
    // Fetch business details and owner
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        owner_id,
        profiles!businesses_owner_id_fkey(id, email, full_name, clerk_user_id)
      `)
      .eq('id', ctx.businessId)
      .single();

    if (businessError) {
      console.error('[business-members] Error fetching business:', businessError);
      return json({ error: 'Failed to fetch business details' }, { status: 500, headers: corsHeaders });
    }

    // Fetch worker members from accepted invites
    const { data: acceptedInvites, error: invitesError } = await supabase
      .from('invites')
      .select(`
        id,
        business_id,
        email,
        role,
        invited_at: created_at,
        accepted_at,
        invited_by,
        profiles!invites_email_fkey(id, email, full_name)
      `)
      .eq('business_id', ctx.businessId)
      .not('accepted_at', 'is', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (invitesError) {
      console.error('[business-members] Error fetching accepted invites:', invitesError);
      return json({ error: 'Failed to fetch worker members' }, { status: 500, headers: corsHeaders });
    }

    // Combine owner and workers into a single members list
    const members = [
      // Owner member
      {
        id: `owner-${business.profiles.id}`,
        business_id: ctx.businessId,
        user_id: business.profiles.id,
        role: 'owner' as const,
        invited_at: null, // Owners aren't invited
        joined_at: null, // Owners don't "join"
        invited_by: null,
        joined_via_invite: false,
        email: business.profiles.email,
        name: business.profiles.full_name
      },
      // Worker members (from accepted invites)
      ...(acceptedInvites || []).map((invite: any) => ({
        id: `worker-${invite.profiles.id}`,
        business_id: invite.business_id,
        user_id: invite.profiles.id,
        role: 'worker' as const,
        invited_at: invite.invited_at,
        joined_at: invite.accepted_at,
        invited_by: invite.invited_by,
        joined_via_invite: true,
        email: invite.profiles.email,
        name: invite.profiles.full_name
      }))
    ];

      console.log('[business-members] Fetched', members.length, 'members (1 owner +', (acceptedInvites?.length || 0), 'workers)');
      return json({ members, count: members.length });
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

    // Find and revoke the accepted invite for this user
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('[business-members] Error finding user profile:', profileError);
      return json({ error: 'User profile not found' }, { status: 404, headers: corsHeaders });
    }

    const { data: invite, error: findError } = await supabase
      .from('invites')
      .select('id')
      .eq('business_id', ctx.businessId)
      .eq('email', userProfile.email)
      .not('accepted_at', 'is', null)
      .is('revoked_at', null)
      .single();

    if (findError || !invite) {
      console.error('[business-members] Error finding invite:', findError);
      return json({ error: 'Member invite not found' }, { status: 404, headers: corsHeaders });
    }

    // Revoke the invite
    const { error: revokeError } = await supabase
      .from('invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (revokeError) {
      console.error('[business-members] Error revoking invite:', revokeError);
      return json({ error: 'Failed to remove team member' }, { status: 500, headers: corsHeaders });
    }

      console.log('[business-members] Member removed:', memberId);
      return json({ success: true });
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
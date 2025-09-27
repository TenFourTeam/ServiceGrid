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
    console.log(`[user-pending-invites] ${req.method} request received`);
    
    if (req.method !== 'GET') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const ctx = await requireCtx(req);
    console.log('[user-pending-invites] User context:', ctx);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending invites for the current user
    const { data: invites, error: invitesError } = await supabase
      .from('invites')
      .select('id, business_id, role, expires_at, created_at, invited_by')
      .eq('invited_user_id', ctx.userId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('[user-pending-invites] Invites error:', invitesError);
      throw new Error(`Failed to fetch pending invites: ${invitesError.message}`);
    }

    console.log('[user-pending-invites] Found', invites?.length || 0, 'pending invites');

    if (!invites || invites.length === 0) {
      return json({
        data: [],
        count: 0
      }, { headers: corsHeaders });
    }

    // Get business details for all invites
    const businessIds = [...new Set(invites.map(invite => invite.business_id))];
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, owner_id')
      .in('id', businessIds);

    if (businessesError) {
      console.error('[user-pending-invites] Businesses error:', businessesError);
      throw new Error(`Failed to fetch businesses: ${businessesError.message}`);
    }

    // Get inviter profile details
    const inviterIds = [...new Set(invites.map(invite => invite.invited_by))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', inviterIds);

    if (profilesError) {
      console.error('[user-pending-invites] Profiles error:', profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Create lookup maps
    const businessMap = new Map(businesses?.map(b => [b.id, b]) || []);
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Format the response
    const formattedInvites = invites.map(invite => {
      const business = businessMap.get(invite.business_id);
      const inviter = profileMap.get(invite.invited_by);
      
      return {
        id: invite.id,
        business: {
          id: business?.id || invite.business_id,
          name: business?.name || 'Unknown Business',
          owner_id: business?.owner_id
        },
        invited_by: {
          id: inviter?.id || invite.invited_by,
          name: inviter?.full_name || 'Unknown User',
          email: inviter?.email || ''
        },
        role: invite.role,
        expires_at: invite.expires_at,
        created_at: invite.created_at
      };
    });

    return json({
      data: formattedInvites,
      count: formattedInvites.length
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('[user-pending-invites] Error:', error);
    return json(
      { error: error.message || 'Failed to fetch pending invites' },
      { status: 500 }
    );
  }
});
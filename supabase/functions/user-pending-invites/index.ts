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
      .select(`
        id,
        business_id,
        role,
        expires_at,
        created_at,
        invited_by,
        businesses!invites_business_id_fkey(id, name, owner_id, logo_url),
        profiles!invites_invited_by_fkey(id, full_name, email)
      `)
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

    // Format the response
    const formattedInvites = (invites || []).map(invite => ({
      id: invite.id,
      business: {
        id: (invite.businesses as any).id,
        name: (invite.businesses as any).name,
        owner_id: (invite.businesses as any).owner_id,
        logo_url: (invite.businesses as any).logo_url
      },
      invited_by: {
        id: (invite.profiles as any).id,
        name: (invite.profiles as any).full_name,
        email: (invite.profiles as any).email
      },
      role: invite.role,
      expires_at: invite.expires_at,
      created_at: invite.created_at
    }));

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
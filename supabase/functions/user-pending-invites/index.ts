import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { corsHeaders, json, requireCtx } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { email, supaAdmin } = await requireCtx(req);

    console.log('Fetching pending invites for user:', email);

    // Get pending invites for the current user's email
    const { data: invites, error: invitesError } = await supaAdmin
      .from('invites')
      .select(`
        id,
        business_id,
        role,
        expires_at,
        created_at,
        email,
        businesses (
          id,
          name,
          logo_url
        )
      `)
      .eq('email', email)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('Error fetching pending invites:', invitesError);
      return json({ error: 'Failed to fetch pending invites' }, { status: 500 });
    }

    console.log(`Found ${invites?.length || 0} pending invites`);

    return json({ invites: invites || [] });

  } catch (error) {
    console.error('Error in user-pending-invites function:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
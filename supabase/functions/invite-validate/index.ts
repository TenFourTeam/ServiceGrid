import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { corsHeaders, json } from "../_lib/auth.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    
    if (!token) {
      return json({ valid: false, message: 'Token is required' }, { status: 400 });
    }

    console.log(`🔍 [invite-validate] Validating invite token: ${token.substring(0, 8)}...`);

    // Hash the token using the same method as invite creation
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find the invite with the matching token hash
    const { data: invite, error } = await supabase
      .from('invites')
      .select(`
        id,
        email,
        role,
        expires_at,
        businesses!inner(
          id,
          name,
          clerk_org_id
        )
      `)
      .eq('token_hash', tokenHash)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .maybeSingle();

    if (error) {
      console.error('❌ [invite-validate] Database error:', error);
      return json({ valid: false, message: 'Failed to validate invitation' }, { status: 500 });
    }

    if (!invite) {
      console.log('❌ [invite-validate] No valid invite found for token hash');
      return json({ valid: false, message: 'This invitation link is invalid or has already been used' });
    }

    // Check if invite has expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    
    if (now > expiresAt) {
      console.log('❌ [invite-validate] Invite has expired');
      return json({ valid: false, message: 'This invitation has expired' });
    }

    // Get inviter name for display
    const { data: inviterProfile } = await supabase
      .from('business_members')
      .select('profiles!inner(full_name)')
      .eq('business_id', invite.businesses.id)
      .eq('role', 'owner')
      .maybeSingle();

    const inviterName = inviterProfile?.profiles?.full_name || 'Team Admin';

    console.log(`✅ [invite-validate] Valid invite found for business: ${invite.businesses.name}`);

    return json({
      valid: true,
      invite: {
        ...invite,
        inviter_name: inviterName
      },
      invite_token_hash: tokenHash
    });

  } catch (error) {
    console.error('❌ [invite-validate] Error validating invite:', error);
    return json({ valid: false, message: 'Failed to validate invitation' }, { status: 500 });
  }
});
import { corsHeaders } from '../_shared/cors.ts';
import { requireCtx } from '../_lib/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

console.log('🚀 [decline-invite] Function loaded');

Deno.serve(async (req) => {
  console.log(`[decline-invite] ${req.method} request to ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[decline-invite] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[decline-invite] Method ${req.method} not allowed`);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Parse request body
    const { inviteId } = await req.json();
    
    if (!inviteId) {
      console.log('[decline-invite] Missing inviteId in request');
      return new Response(
        JSON.stringify({ error: 'Missing inviteId' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[decline-invite] Processing invite: ${inviteId}`);

    // Authenticate user
    const ctx = await requireCtx(req);
    console.log(`[decline-invite] Authenticated user: ${ctx.userId}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the invite and verify it belongs to the current user
    console.log('[decline-invite] Looking up invite');
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('invites')
      .select('id, business_id, role, invited_user_id, expires_at, accepted_at, revoked_at')
      .eq('id', inviteId)
      .eq('invited_user_id', ctx.userId)
      .single();

    if (inviteError || !invite) {
      console.error('[decline-invite] Invite not found:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Invalid invite token' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if invite is already handled
    if (invite.accepted_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has already been accepted' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (invite.revoked_at) {
      return new Response(
        JSON.stringify({ error: 'Invite has already been declined' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mark invite as revoked (declined)
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('invites')
      .update({ 
        revoked_at: now
      })
      .eq('id', inviteId);

    if (updateError) {
      console.error('[decline-invite] Error declining invite:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to decline invite' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[decline-invite] Successfully declined invite');
    return new Response(
      JSON.stringify({
        message: 'Invite declined successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[decline-invite] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
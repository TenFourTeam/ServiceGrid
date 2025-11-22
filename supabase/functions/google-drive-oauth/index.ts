import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireCtx } from '../_lib/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // TODO: Replace with real credentials when available
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') || 'PLACEHOLDER_CLIENT_ID';
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') || 'PLACEHOLDER_SECRET';
    const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-drive-oauth?action=callback`;

    console.log('[Google Drive OAuth] Action:', action);

    if (action === 'connect') {
      // Generate OAuth URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', ctx.businessId); // Pass business ID as state

      console.log('[Google Drive OAuth] Generated auth URL');

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      // Handle OAuth callback
      const code = url.searchParams.get('code');
      const businessId = url.searchParams.get('state');

      // TODO: Exchange code for tokens when real credentials available
      console.log('[Google Drive OAuth] Callback received:', { code: code?.slice(0, 10), businessId });

      // Mock response for now
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'OAuth flow will complete when credentials are configured',
        businessId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive OAuth Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

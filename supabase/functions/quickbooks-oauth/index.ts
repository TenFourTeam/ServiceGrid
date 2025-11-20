import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // TODO: Replace with real credentials when available
    const QB_CLIENT_ID = Deno.env.get('QUICKBOOKS_CLIENT_ID') || 'PLACEHOLDER_CLIENT_ID';
    const QB_CLIENT_SECRET = Deno.env.get('QUICKBOOKS_CLIENT_SECRET') || 'PLACEHOLDER_SECRET';
    const QB_REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/quickbooks-oauth?action=callback`;

    console.log('[QB OAuth] Action:', action);

    if (action === 'connect') {
      // Generate OAuth URL
      const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
      authUrl.searchParams.set('client_id', QB_CLIENT_ID);
      authUrl.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
      authUrl.searchParams.set('redirect_uri', QB_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', 'RANDOM_STATE_TOKEN'); // TODO: Generate secure state token

      console.log('[QB OAuth] Generated auth URL');

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      // Handle OAuth callback
      const code = url.searchParams.get('code');
      const realmId = url.searchParams.get('realmId');

      // TODO: Exchange code for tokens when real credentials available
      console.log('[QB OAuth] Callback received:', { code: code?.slice(0, 10), realmId });

      // Mock response for now
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'OAuth flow will complete when credentials are configured',
        realmId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      // TODO: Revoke tokens and delete connection
      console.log('[QB OAuth] Disconnect requested');
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB OAuth Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

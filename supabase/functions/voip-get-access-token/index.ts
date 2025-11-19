import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

// Simple JWT creation for Twilio (without external dependencies)
function createTwilioToken(accountSid: string, identity: string, ttl: number = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    typ: 'JWT',
    alg: 'HS256',
    cty: 'twilio-fpa;v=1'
  };

  const grants = {
    identity: identity,
    voice: {
      incoming: { allow: true },
      outgoing: {
        application_sid: accountSid,
      },
    },
  };

  const payload = {
    jti: `${accountSid}-${now}`,
    iss: accountSid,
    sub: accountSid,
    exp: now + ttl,
    grants: grants,
  };

  const base64url = (str: string) => 
    btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  
  const message = `${encodedHeader}.${encodedPayload}`;
  
  // Create HMAC-SHA256 signature using Web Crypto API
  const encoder = new TextEncoder();
  const key = encoder.encode(twilioAuthToken!);
  
  return crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(cryptoKey => 
    crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  ).then(signature => {
    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return `${message}.${signatureBase64}`;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!twilioAccountSid || !twilioAuthToken) {
      return json({ 
        error: 'Twilio not configured',
        message: 'Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN secrets.'
      }, { status: 400 });
    }

    const url = new URL(req.url);
    const deviceName = url.searchParams.get('deviceName') || 'web-browser';
    const identity = `user-${ctx.userId}`;

    // Generate Twilio access token
    const token = await createTwilioToken(twilioAccountSid, identity, 3600);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // Register or update device
    const { error: deviceError } = await supabase
      .from('voip_devices')
      .upsert({
        business_id: ctx.businessId,
        user_id: ctx.userId,
        device_name: deviceName,
        device_type: 'web',
        last_seen_at: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: 'business_id,user_id,device_name'
      });

    if (deviceError) {
      console.error('[voip-get-access-token] Device registration error:', deviceError);
    }

    console.log('[voip-get-access-token] Token generated for:', identity);

    return json({
      token,
      identity,
      expiresAt,
    });

  } catch (error: any) {
    console.error('[voip-get-access-token] Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
});

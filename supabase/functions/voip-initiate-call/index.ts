import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

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

    const { to, customerId } = await req.json();

    if (!to) {
      return json({ error: 'Phone number (to) is required' }, { status: 400 });
    }

    // Validate E.164 format
    if (!/^\+[1-9]\d{1,14}$/.test(to)) {
      return json({ error: 'Invalid phone number format. Use E.164 format (e.g., +15125551234)' }, { status: 400 });
    }

    // Get business's first active phone number
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('phone_number, twilio_sid')
      .eq('business_id', ctx.businessId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (phoneError || !phoneNumber) {
      return json({ error: 'No active phone number found for this business' }, { status: 400 });
    }

    // Create TwiML for the call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${phoneNumber.phone_number}">
    <Number>${to}</Number>
  </Dial>
</Response>`;

    // Initiate call via Twilio
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    const callResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: phoneNumber.phone_number,
          Twiml: twiml,
          StatusCallback: `${supabaseUrl}/functions/v1/voip-webhook-handler`,
          StatusCallbackMethod: 'POST',
          StatusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        }),
      }
    );

    if (!callResponse.ok) {
      const error = await callResponse.text();
      console.error('[voip-initiate-call] Twilio error:', error);
      return json({ error: 'Failed to initiate call', details: error }, { status: callResponse.status });
    }

    const callData = await callResponse.json();

    // Insert call log
    const { data: callLog, error: logError } = await supabase
      .from('call_logs')
      .insert({
        business_id: ctx.businessId,
        phone_number_id: phoneNumber.twilio_sid,
        user_id: ctx.userId,
        customer_id: customerId || null,
        call_sid: callData.sid,
        direction: 'outbound',
        from_number: phoneNumber.phone_number,
        to_number: to,
        status: 'queued',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('[voip-initiate-call] Call log error:', logError);
    }

    console.log('[voip-initiate-call] Call initiated:', callData.sid);

    return json({
      callSid: callData.sid,
      status: callData.status,
      to: callData.to,
      from: callData.from,
    });

  } catch (error: any) {
    console.error('[voip-initiate-call] Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
});

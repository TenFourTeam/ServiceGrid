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

    // Check if user is business owner
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', ctx.businessId)
      .single();

    if (business?.owner_id !== ctx.userId) {
      return json({ error: 'Only business owners can manage phone numbers' }, { status: 403 });
    }

    // Check if Twilio is configured
    if (!twilioAccountSid || !twilioAuthToken) {
      return json({ 
        error: 'Twilio not configured',
        message: 'Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN secrets to enable VoIP functionality.'
      }, { status: 400 });
    }

    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    if (req.method === 'GET') {
      // Search available phone numbers
      const url = new URL(req.url);
      const country = url.searchParams.get('country') || 'US';
      const areaCode = url.searchParams.get('areaCode') || '';
      const contains = url.searchParams.get('contains') || '';

      let searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/${country}/Local.json?`;
      
      if (areaCode) searchUrl += `AreaCode=${areaCode}&`;
      if (contains) searchUrl += `Contains=${contains}&`;

      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[voip-purchase-number] Twilio search error:', error);
        return json({ error: 'Failed to search phone numbers', details: error }, { status: response.status });
      }

      const data = await response.json();
      
      return json({ 
        availableNumbers: data.available_phone_numbers?.slice(0, 10).map((num: any) => ({
          phoneNumber: num.phone_number,
          friendlyName: num.friendly_name,
          locality: num.locality,
          region: num.region,
          capabilities: num.capabilities,
        })) || []
      });
    }

    if (req.method === 'POST') {
      // Purchase a phone number
      const { phoneNumber } = await req.json();

      if (!phoneNumber) {
        return json({ error: 'Phone number is required' }, { status: 400 });
      }

      // Configure webhook URLs
      const webhookBaseUrl = `${supabaseUrl}/functions/v1/voip-webhook-handler`;
      
      const purchaseResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            PhoneNumber: phoneNumber,
            VoiceUrl: webhookBaseUrl,
            VoiceMethod: 'POST',
            StatusCallback: webhookBaseUrl,
            StatusCallbackMethod: 'POST',
            SmsUrl: webhookBaseUrl,
            SmsMethod: 'POST',
          }),
        }
      );

      if (!purchaseResponse.ok) {
        const error = await purchaseResponse.text();
        console.error('[voip-purchase-number] Twilio purchase error:', error);
        return json({ error: 'Failed to purchase phone number', details: error }, { status: purchaseResponse.status });
      }

      const purchasedNumber = await purchaseResponse.json();

      // Insert into database
      const { data: dbRecord, error: dbError } = await supabase
        .from('phone_numbers')
        .insert({
          business_id: ctx.businessId,
          phone_number: purchasedNumber.phone_number,
          friendly_name: purchasedNumber.friendly_name,
          twilio_sid: purchasedNumber.sid,
          capabilities: purchasedNumber.capabilities,
          status: 'active',
        })
        .select()
        .single();

      if (dbError) {
        console.error('[voip-purchase-number] Database error:', dbError);
        return json({ error: 'Failed to save phone number', details: dbError.message }, { status: 500 });
      }

      console.log('[voip-purchase-number] Successfully purchased number:', phoneNumber);
      
      return json({ 
        phoneNumber: {
          id: dbRecord.id,
          phoneNumber: dbRecord.phone_number,
          friendlyName: dbRecord.friendly_name,
          twilioSid: dbRecord.twilio_sid,
          status: dbRecord.status,
        }
      });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[voip-purchase-number] Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
});

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse Twilio webhook data (form-urlencoded)
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const direction = formData.get('Direction') as string;
    const duration = formData.get('CallDuration') as string;
    const recordingUrl = formData.get('RecordingUrl') as string | null;

    console.log('[voip-webhook-handler] Webhook received:', {
      callSid,
      callStatus,
      direction,
    });

    if (!callSid) {
      console.error('[voip-webhook-handler] Missing CallSid');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'canceled': 'canceled',
    };

    const mappedStatus = statusMap[callStatus] || callStatus;

    // Try to find existing call log
    const { data: existingLog } = await supabase
      .from('call_logs')
      .select('id, business_id')
      .eq('call_sid', callSid)
      .single();

    if (existingLog) {
      // Update existing call log
      const updateData: any = {
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      };

      if (callStatus === 'in-progress' && !existingLog.started_at) {
        updateData.started_at = new Date().toISOString();
      }

      if (callStatus === 'completed') {
        updateData.ended_at = new Date().toISOString();
        if (duration) {
          updateData.duration_seconds = parseInt(duration, 10);
        }
        if (recordingUrl) {
          updateData.recording_url = recordingUrl;
        }
      }

      const { error: updateError } = await supabase
        .from('call_logs')
        .update(updateData)
        .eq('id', existingLog.id);

      if (updateError) {
        console.error('[voip-webhook-handler] Update error:', updateError);
      }

      console.log('[voip-webhook-handler] Updated call log:', existingLog.id);
    } else {
      // Create new call log for inbound calls
      if (direction === 'inbound') {
        // Try to find customer by phone number
        const { data: customer } = await supabase
          .from('customers')
          .select('id, business_id')
          .eq('phone', from)
          .single();

        const { error: insertError } = await supabase
          .from('call_logs')
          .insert({
            business_id: customer?.business_id || null,
            customer_id: customer?.id || null,
            call_sid: callSid,
            direction: 'inbound',
            from_number: from,
            to_number: to,
            status: mappedStatus,
            started_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[voip-webhook-handler] Insert error:', insertError);
        }

        console.log('[voip-webhook-handler] Created inbound call log');
      }
    }

    // Return empty TwiML response
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[voip-webhook-handler] Error:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  }
});

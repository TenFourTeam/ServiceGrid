import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    console.log('Email sending temporarily disabled');
    
    return json({
      message: 'Email sending temporarily disabled',
      success: false
    });

  } catch (error) {
    console.error('Error in resend-send-email:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
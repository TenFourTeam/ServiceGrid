import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ServiceRequest {
  serviceType: string;
  description: string;
  preferredDate?: string;
  preferredTime?: string;
  address?: string;
  urgency?: 'normal' | 'urgent';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate customer via session token
    const sessionToken = req.headers.get('x-session-token');
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('customer_sessions')
      .select('*, customer_accounts(*, customers(id, name, email, phone, address, business_id))')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer = session.customer_accounts.customers;
    const customerId = customer.id;
    const businessId = customer.business_id;

    const body: ServiceRequest = await req.json();
    const { serviceType, description, preferredDate, preferredTime, address, urgency = 'normal' } = body;

    if (!serviceType || !description) {
      return new Response(
        JSON.stringify({ error: 'Service type and description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get business owner_id for request creation
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build notes with all details
    const notes = [
      `Service Type: ${serviceType}`,
      `Description: ${description}`,
      preferredDate ? `Preferred Date: ${preferredDate}` : null,
      preferredTime ? `Preferred Time: ${preferredTime}` : null,
      urgency === 'urgent' ? '⚠️ URGENT REQUEST' : null,
    ].filter(Boolean).join('\n');

    // Create the service request
    const { data: request, error: createError } = await supabase
      .from('requests')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        owner_id: business.owner_id,
        source: 'customer_portal',
        status: 'New',
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: address || customer.address,
        notes,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating service request:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create service request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Service request created: ${request.id} from customer ${customerId}`);

    return new Response(
      JSON.stringify({ success: true, request }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Customer service request error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

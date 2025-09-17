import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublicRequestData {
  business_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  title: string;
  property_address?: string;
  service_details: string;
  preferred_assessment_date?: string;
  alternative_date?: string;
  preferred_times?: string[];
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Public request submit - method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Initialize Supabase client with service role key for bypassing RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: PublicRequestData = await req.json();
    console.log('Received request data:', { ...requestData, customer_email: '[REDACTED]' });

    // Validate required fields
    if (!requestData.business_id) {
      return new Response(JSON.stringify({ error: 'Business ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!requestData.customer_name || !requestData.customer_email || !requestData.title || !requestData.service_details) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify business exists
    console.log('Checking if business exists:', requestData.business_id);
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, owner_id')
      .eq('id', requestData.business_id)
      .single();

    if (businessError || !business) {
      console.error('Business not found:', businessError);
      return new Response(JSON.stringify({ error: 'Business not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Business found:', business.name);

    // Check if customer already exists by email
    console.log('Looking for existing customer:', requestData.customer_email);
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, name, email, phone, address')
      .eq('business_id', requestData.business_id)
      .eq('email', requestData.customer_email)
      .single();

    let customerId: string;

    if (existingCustomer) {
      console.log('Customer exists, updating:', existingCustomer.id);
      customerId = existingCustomer.id;
      
      // Update customer information if provided
      const updateData: any = {};
      if (requestData.customer_name && requestData.customer_name !== existingCustomer.name) {
        updateData.name = requestData.customer_name;
      }
      if (requestData.customer_phone && requestData.customer_phone !== existingCustomer.phone) {
        updateData.phone = requestData.customer_phone;
      }
      if (requestData.customer_address && requestData.customer_address !== existingCustomer.address) {
        updateData.address = requestData.customer_address;
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('customers')
          .update(updateData)
          .eq('id', customerId);
        
        if (updateError) {
          console.error('Error updating customer:', updateError);
        } else {
          console.log('Customer updated successfully');
        }
      }
    } else {
      console.log('Creating new customer');
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          business_id: requestData.business_id,
          owner_id: business.owner_id,
          name: requestData.customer_name,
          email: requestData.customer_email,
          phone: requestData.customer_phone || null,
          address: requestData.customer_address || null,
        })
        .select()
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return new Response(JSON.stringify({ error: 'Failed to create customer record' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      customerId = newCustomer.id;
      console.log('New customer created:', customerId);
    }

    // Create the request
    console.log('Creating request for customer:', customerId);
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .insert({
        business_id: requestData.business_id,
        owner_id: business.owner_id,
        customer_id: customerId,
        title: requestData.title,
        property_address: requestData.property_address || null,
        service_details: requestData.service_details,
        preferred_assessment_date: requestData.preferred_assessment_date || null,
        alternative_date: requestData.alternative_date || null,
        preferred_times: requestData.preferred_times || [],
        status: 'New',
        notes: requestData.notes || null,
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      return new Response(JSON.stringify({ error: 'Failed to create request' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Request created successfully:', request.id);

    return new Response(JSON.stringify({ 
      success: true, 
      request_id: request.id,
      message: 'Request submitted successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in public-request-submit function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
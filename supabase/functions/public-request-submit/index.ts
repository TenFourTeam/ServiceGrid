import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublicRequestData {
  business_id: string;
  customer_name?: string | null;
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
  photos?: string[];
}

/**
 * Generate branded request confirmation email
 */
function generateRequestConfirmationEmail(
  businessName: string,
  businessLogoUrl: string | null,
  customerName: string,
  customerEmail: string,
  requestTitle: string,
  serviceDetails: string,
  preferredDate?: string,
  preferredTimes?: string[]
) {
  const subject = `${businessName} • Request Confirmation`;
  
  const headerLeft = businessLogoUrl 
    ? `<img src="${businessLogoUrl}" alt="${businessName} logo" style="height:32px; max-height:32px; border-radius:4px; display:block;" />`
    : `<span style="font-weight:600; font-size:16px; color:#f8fafc;">${businessName}</span>`;

  const formattedDate = preferredDate ? new Date(preferredDate).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : null;

  const timesText = preferredTimes && preferredTimes.length > 0 
    ? preferredTimes.join(', ') 
    : 'Any time';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Request Confirmation - ${businessName}</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding:24px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="left">${headerLeft}</td>
                        <td align="right" style="color:#f8fafc; font-weight:600; font-size:14px; opacity:0.9;">Request Confirmation</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding:40px 32px;">
                    
                    <!-- Greeting -->
                    <div style="margin-bottom:32px;">
                      <h1 style="margin:0 0 16px; font-size:28px; font-weight:700; color:#111827; line-height:1.2;">
                        Thank you, ${customerName}!
                      </h1>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#6b7280;">
                        We've received your service request and will get back to you soon.
                      </p>
                    </div>

                    <!-- Request Details -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:24px; margin-bottom:32px;">
                      <h2 style="margin:0 0 16px; font-size:18px; font-weight:600; color:#111827;">Your Request Details</h2>
                      
                      <div style="margin-bottom:16px;">
                        <div style="font-weight:600; color:#111827; margin-bottom:4px;">Service Requested:</div>
                        <div style="color:#374151;">${requestTitle}</div>
                      </div>
                      
                      <div style="margin-bottom:16px;">
                        <div style="font-weight:600; color:#111827; margin-bottom:4px;">Details:</div>
                        <div style="color:#374151; line-height:1.6;">${serviceDetails}</div>
                      </div>
                      
                      ${formattedDate ? `
                        <div style="margin-bottom:16px;">
                          <div style="font-weight:600; color:#111827; margin-bottom:4px;">Preferred Date:</div>
                          <div style="color:#374151;">${formattedDate}</div>
                        </div>
                      ` : ''}
                      
                      <div>
                        <div style="font-weight:600; color:#111827; margin-bottom:4px;">Preferred Time:</div>
                        <div style="color:#374151;">${timesText}</div>
                      </div>
                    </div>

                    <!-- What's Next -->
                    <div style="background:#fef3c7; border:1px solid #fbbf24; border-radius:8px; padding:24px; margin-bottom:32px;">
                      <h3 style="margin:0 0 12px; font-size:16px; font-weight:600; color:#92400e;">What happens next?</h3>
                      <ul style="margin:0; padding-left:20px; color:#92400e; line-height:1.7;">
                        <li style="margin-bottom:8px;">We'll review your request within 24 hours</li>
                        <li style="margin-bottom:8px;">Our team will contact you to schedule an assessment</li>
                        <li style="margin-bottom:8px;">We'll provide you with a detailed quote</li>
                      </ul>
                    </div>

                    <!-- Contact Info -->
                    <div style="border-top:1px solid #e5e7eb; padding-top:24px;">
                      <p style="margin:0; font-size:14px; color:#6b7280; text-align:center; line-height:1.5;">
                        Have questions? Simply reply to this email and we'll get back to you promptly.
                      </p>
                    </div>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f8fafc; padding:24px 32px; border-top:1px solid #e5e7eb; text-align:center;">
                    <p style="margin:0 0 8px; font-size:14px; color:#374151; font-weight:600;">
                      ${businessName}
                    </p>
                    <p style="margin:0; font-size:12px; color:#6b7280;">
                      Professional service management
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html };
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

    if (!requestData.customer_email || !requestData.title || !requestData.service_details) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify business exists
    console.log('Checking if business exists:', requestData.business_id);
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, owner_id, logo_url, light_logo_url')
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
      if (requestData.customer_name && requestData.customer_name.trim() && requestData.customer_name !== existingCustomer.name) {
        updateData.name = requestData.customer_name.trim();
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
      // Create new customer with fallback name
      const customerName = requestData.customer_name?.trim() || 
                          requestData.customer_email.split('@')[0] || 
                          'Anonymous Customer';
      
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          business_id: requestData.business_id,
          owner_id: business.owner_id,
          name: customerName,
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
    console.log('Request data being inserted:', {
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
      photos: requestData.photos || [],
    });
    
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
        photos: requestData.photos || [],
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      console.error('Request error details:', {
        message: requestError.message,
        code: requestError.code,
        details: requestError.details,
        hint: requestError.hint
      });
      return new Response(JSON.stringify({ 
        error: 'Failed to create request',
        details: requestError.message,
        code: requestError.code 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Request created successfully:', request.id);

    // Note: Email confirmation temporarily disabled
    console.log('Request submitted successfully (email confirmation disabled)');

    return new Response(JSON.stringify({ 
      success: true, 
      request_id: request.id,
      message: 'Request submitted successfully',
      business: {
        id: business.id,
        name: business.name,
        logo_url: business.logo_url,
        light_logo_url: business.light_logo_url
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in public-request-submit function:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      code: error.code
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
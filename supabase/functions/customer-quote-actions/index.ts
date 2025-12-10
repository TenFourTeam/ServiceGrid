import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Helper to send notification email to business owner
async function sendBusinessNotification(
  supabase: any,
  businessId: string,
  quoteNumber: string,
  customerName: string,
  action: 'accepted' | 'declined' | 'changes_requested',
  customerNotes?: string
) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    
    if (!resendApiKey || !fromEmail) {
      console.log('Email not configured, skipping notification');
      return;
    }

    // Get business owner email
    const { data: business } = await supabase
      .from('businesses')
      .select('name, owner_id, profiles!businesses_owner_id_fkey(email)')
      .eq('id', businessId)
      .single();

    if (!business?.profiles?.email) {
      console.log('Business owner email not found');
      return;
    }

    const resend = new Resend(resendApiKey);
    const ownerEmail = business.profiles.email;
    const businessName = business.name || 'Your Business';

    const actionMessages = {
      accepted: {
        subject: `Quote ${quoteNumber} Accepted by ${customerName}`,
        title: 'Quote Accepted!',
        description: `${customerName} has accepted Quote ${quoteNumber}. A work order has been automatically created.`,
        color: '#16a34a'
      },
      declined: {
        subject: `Quote ${quoteNumber} Declined by ${customerName}`,
        title: 'Quote Declined',
        description: `${customerName} has declined Quote ${quoteNumber}.`,
        color: '#dc2626'
      },
      changes_requested: {
        subject: `Quote ${quoteNumber} - Changes Requested by ${customerName}`,
        title: 'Changes Requested',
        description: `${customerName} has requested changes to Quote ${quoteNumber}.`,
        color: '#f59e0b'
      }
    };

    const msg = actionMessages[action];
    const notesSection = customerNotes ? `
      <div style="margin-top: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px;">
        <strong>Customer Notes:</strong>
        <p style="margin: 8px 0 0; white-space: pre-wrap;">${customerNotes}</p>
      </div>
    ` : '';

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #111827; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="padding: 12px 16px; background: #111827; color: #fff; border-radius: 8px 8px 0 0;">
          <strong>${businessName}</strong>
        </div>
        <div style="padding: 16px;">
          <div style="display: inline-block; width: 12px; height: 12px; border-radius: 999px; background: ${msg.color}; margin-right: 8px; vertical-align: middle;"></div>
          <span style="font-size: 18px; font-weight: 700;">${msg.title}</span>
          <p style="margin: 12px 0 0; color: #475569;">${msg.description}</p>
          ${notesSection}
          <p style="margin: 16px 0 0; font-size: 14px; color: #6b7280;">
            This action was taken via the customer portal.
          </p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: `${businessName} <${fromEmail}>`,
      to: [ownerEmail],
      subject: msg.subject,
      html
    });

    console.log(`Notification email sent to ${ownerEmail} for ${action}`);
  } catch (error) {
    console.error('Failed to send notification email:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      console.error('Session validation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = session.customer_accounts.customers.id;
    const businessId = session.customer_accounts.customers.business_id;
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const quoteId = url.searchParams.get('quoteId');
      
      if (!quoteId) {
        return new Response(
          JSON.stringify({ error: 'Quote ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch quote with line items - include signature_data_url and approved_by
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          id, number, status, total, subtotal, tax_rate, discount,
          address, terms, deposit_required, deposit_percent,
          payment_terms, frequency, created_at, sent_at, approved_at,
          public_token, customer_notes, notes_internal,
          signature_data_url, approved_by,
          quote_line_items(id, name, qty, unit, unit_price, line_total, position)
        `)
        .eq('id', quoteId)
        .eq('customer_id', customerId)
        .single();

      if (quoteError || !quote) {
        console.error('Quote fetch error:', quoteError);
        return new Response(
          JSON.stringify({ error: 'Quote not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get business info for branding
      const { data: business } = await supabase
        .from('businesses')
        .select('id, name, logo_url, light_logo_url, phone, reply_to_email')
        .eq('id', businessId)
        .single();

      // Get customer name
      const customerName = session.customer_accounts.customers.name;

      return new Response(
        JSON.stringify({ 
          quote,
          business,
          customerName
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, quoteId, signature, notes } = body;

      if (!quoteId || !action) {
        return new Response(
          JSON.stringify({ error: 'Quote ID and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify quote belongs to customer and get full details for work order creation
      const { data: quote, error: verifyError } = await supabase
        .from('quotes')
        .select('id, status, public_token, number, owner_id, business_id, customer_id, address, total, is_subscription')
        .eq('id', quoteId)
        .eq('customer_id', customerId)
        .single();

      if (verifyError || !quote) {
        console.error('Quote verification error:', verifyError);
        return new Response(
          JSON.stringify({ error: 'Quote not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customerName = session.customer_accounts.customers.name;

      // Handle different actions
      switch (action) {
        case 'accept': {
          if (!signature) {
            return new Response(
              JSON.stringify({ error: 'Signature is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { error: updateError } = await supabase
            .from('quotes')
            .update({
              status: 'Approved',
              approved_at: new Date().toISOString(),
              approved_by: customerName,
              signature_data_url: signature,
            })
            .eq('id', quoteId);

          if (updateError) {
            console.error('Quote accept error:', updateError);
            throw updateError;
          }

          // Handle subscription creation for approved quotes
          if (quote.is_subscription) {
            console.log("Quote is a subscription, creating Stripe subscription...");
            try {
              const subscriptionResponse = await supabase.functions.invoke('manage-quote-subscription', {
                body: { quoteId }
              });
              if (subscriptionResponse.error) {
                console.error("Failed to create subscription:", subscriptionResponse.error);
              } else {
                console.log("Subscription created successfully:", subscriptionResponse.data);
              }
            } catch (subscriptionError) {
              console.error("Error creating subscription:", subscriptionError);
            }
          } else {
            // Create work order for non-subscription quotes
            console.log("Creating work order for approved quote...");
            try {
              const { error: jobError } = await supabase
                .from('jobs')
                .insert({
                  owner_id: quote.owner_id,
                  business_id: quote.business_id,
                  customer_id: quote.customer_id,
                  quote_id: quoteId,
                  title: `${quote.number} - Service`,
                  address: quote.address,
                  status: 'Scheduled',
                  total: quote.total,
                  job_type: 'appointment',
                  is_clocked_in: false,
                  is_recurring: false
                });

              if (jobError) {
                console.error("Failed to create work order:", jobError);
              } else {
                console.log("Work order created successfully");
              }
            } catch (jobErr) {
              console.error("Error creating work order:", jobErr);
            }
          }

          // Send notification to business owner
          await sendBusinessNotification(supabase, businessId, quote.number, customerName, 'accepted');

          console.log(`Quote ${quoteId} accepted by customer ${customerId}`);
          
          return new Response(
            JSON.stringify({ success: true, status: 'Approved' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'decline': {
          const { error: updateError } = await supabase
            .from('quotes')
            .update({
              status: 'Declined',
            })
            .eq('id', quoteId);

          if (updateError) {
            console.error('Quote decline error:', updateError);
            throw updateError;
          }

          // Send notification to business owner
          await sendBusinessNotification(supabase, businessId, quote.number, customerName, 'declined');

          console.log(`Quote ${quoteId} declined by customer ${customerId}`);
          
          return new Response(
            JSON.stringify({ success: true, status: 'Declined' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'request_changes': {
          if (!notes) {
            return new Response(
              JSON.stringify({ error: 'Notes are required for change requests' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { error: updateError } = await supabase
            .from('quotes')
            .update({
              status: 'Edits Requested',
              customer_notes: notes,
            })
            .eq('id', quoteId);

          if (updateError) {
            console.error('Quote change request error:', updateError);
            throw updateError;
          }

          // Send notification to business owner with customer notes
          await sendBusinessNotification(supabase, businessId, quote.number, customerName, 'changes_requested', notes);

          console.log(`Quote ${quoteId} change requested by customer ${customerId}`);
          
          return new Response(
            JSON.stringify({ success: true, status: 'Edits Requested' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Customer quote actions error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

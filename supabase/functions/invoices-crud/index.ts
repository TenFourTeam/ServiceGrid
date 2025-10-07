import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[invoices-crud] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[invoices-crud] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');
      
      // Handle get_payments action
      if (action === 'get_payments') {
        const invoiceId = url.searchParams.get('invoiceId');
        
        if (!invoiceId) {
          throw new Error('Invoice ID is required for get_payments action');
        }
        
        console.log('[invoices-crud] Fetching payments for invoice:', invoiceId);
        
        // Verify user has access to this invoice and is business owner
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('business_id')
          .eq('id', invoiceId)
          .eq('business_id', ctx.businessId)
          .single();
        
        if (invoiceError || !invoiceData) {
          throw new Error('Invoice not found or access denied');
        }
        
        // Check if user is business owner (payments are now restricted to owners only)
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('owner_id')
          .eq('id', ctx.businessId)
          .single();
        
        if (businessError || !businessData || businessData.owner_id !== ctx.userId) {
          throw new Error('Access denied: Only business owners can view payment information');
        }
        
        // Fetch payments for the invoice
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', invoiceId);
        
        if (paymentsError) {
          console.error('[invoices-crud] Error fetching payments:', paymentsError);
          throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
        }
        
        const payments = paymentsData?.map(payment => ({
          id: payment.id,
          invoiceId: payment.invoice_id,
          amount: payment.amount,
          method: payment.method,
          receivedAt: payment.received_at,
          createdAt: payment.created_at,
          last4: payment.last4
        })) || [];
        
        console.log('[invoices-crud] Fetched', payments.length, 'payments for invoice');
        return json({ payments });
      }
      
      // Default GET action - fetch all invoices
      const { data, error, count } = await supabase
        .from('invoices')
        .select(`
          id, number, total, subtotal, tax_rate, discount, status, due_at, paid_at, 
          created_at, updated_at, public_token, job_id, quote_id,
          customer_id, address, payment_terms, frequency, 
          deposit_required, deposit_percent, notes_internal, terms,
          customers!inner(name, email)
        `, { count: 'exact' })
        .eq('business_id', ctx.businessId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[invoices-crud] GET error:', error);
        throw new Error(`Failed to fetch invoices: ${error.message}`);
      }

      // Fetch line items for all invoices
      const invoiceIds = data?.map(inv => inv.id) || [];
      let lineItemsMap: Record<string, any[]> = {};
      
      if (invoiceIds.length > 0) {
        const { data: lineItemsData } = await supabase
          .from('invoice_line_items')
          .select('*')
          .in('invoice_id', invoiceIds)
          .order('position', { ascending: true });
        
        if (lineItemsData) {
          lineItemsMap = lineItemsData.reduce((acc, item) => {
            if (!acc[item.invoice_id]) acc[item.invoice_id] = [];
            acc[item.invoice_id].push({
              id: item.id,
              name: item.name,
              qty: item.qty,
              unitPrice: item.unit_price,
              lineTotal: item.line_total,
              unit: item.unit,
              position: item.position
            });
            return acc;
          }, {} as Record<string, any[]>);
        }
      }

      const invoices = data?.map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number,
        total: invoice.total,
        subtotal: invoice.subtotal,
        taxRate: invoice.tax_rate,
        discount: invoice.discount,
        status: invoice.status,
        dueAt: invoice.due_at,
        paidAt: invoice.paid_at,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        publicToken: invoice.public_token,
        customerId: invoice.customer_id,
        jobId: invoice.job_id,
        quoteId: invoice.quote_id,
        customerName: invoice.customers?.name,
        customerEmail: invoice.customers?.email,
        address: invoice.address,
        paymentTerms: invoice.payment_terms,
        frequency: invoice.frequency,
        depositRequired: invoice.deposit_required || false,
        depositPercent: invoice.deposit_percent,
        notesInternal: invoice.notes_internal,
        terms: invoice.terms,
        lineItems: lineItemsMap[invoice.id] || [],
      })) || [];

      console.log('[invoices-crud] Fetched', invoices.length, 'invoices');
      return json({ invoices, count: count || 0 });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      
      // Handle send invoice email action
      if (body.action === 'send') {
        console.log('[invoices-crud] Sending invoice email:', body.invoiceId);
        
        const { invoiceId, recipientEmail, subject, message } = body;
        
        // Validate required fields
        if (!invoiceId || !recipientEmail || !subject) {
          return json({ error: 'Missing required fields: invoiceId, recipientEmail, subject' }, { status: 400 });
        }
        
        // Fetch invoice with all details
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            id, number, status, total, subtotal, tax_rate, discount, due_at, created_at,
            address, payment_terms, frequency, deposit_required, deposit_percent, terms,
            public_token, customer_id, business_id
          `)
          .eq('id', invoiceId)
          .eq('business_id', ctx.businessId)
          .single();
        
        if (invoiceError || !invoiceData) {
          console.error('[invoices-crud] Invoice fetch error:', invoiceError);
          return json({ error: 'Invoice not found' }, { status: 404 });
        }
        
        // Fetch line items
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .select('name, qty, unit, unit_price, line_total')
          .eq('invoice_id', invoiceId)
          .order('position');
        
        if (lineItemsError) {
          console.error('[invoices-crud] Line items fetch error:', lineItemsError);
        }
        
        // Fetch customer
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('name, email')
          .eq('id', invoiceData.customer_id)
          .single();
        
        if (customerError) {
          console.error('[invoices-crud] Customer fetch error:', customerError);
        }
        
        // Fetch business info
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('name, logo_url')
          .eq('id', ctx.businessId)
          .single();
        
        if (businessError) {
          console.error('[invoices-crud] Business fetch error:', businessError);
        }
        
        // Generate payment URL
        const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://app.example.com';
        const payUrl = invoiceData.public_token 
          ? `${FRONTEND_URL}/invoice-pay?token=${invoiceData.public_token}`
          : undefined;
        
        // Transform data to match Invoice type (snake_case to camelCase)
        const invoice = {
          id: invoiceData.id,
          number: invoiceData.number,
          status: invoiceData.status,
          total: invoiceData.total,
          subtotal: invoiceData.subtotal,
          taxRate: invoiceData.tax_rate,
          discount: invoiceData.discount,
          dueAt: invoiceData.due_at,
          createdAt: invoiceData.created_at,
          address: invoiceData.address,
          paymentTerms: invoiceData.payment_terms,
          frequency: invoiceData.frequency,
          depositRequired: invoiceData.deposit_required,
          depositPercent: invoiceData.deposit_percent,
          terms: invoiceData.terms,
          lineItems: lineItemsData?.map(li => ({
            name: li.name,
            qty: li.qty,
            unit: li.unit,
            unitPrice: li.unit_price,
            lineTotal: li.line_total
          })) || []
        };
        
        // Generate email HTML using shared template
        const { generateInvoiceEmail, combineMessageWithEmail } = await import('../_shared/invoiceEmailTemplate.ts');
        
        const { html: emailHtml } = generateInvoiceEmail({
          businessName: businessData?.name || 'Your Business',
          businessLogoUrl: businessData?.logo_url,
          customerName: customerData?.name,
          invoice: invoice,
          payUrl: payUrl
        });
        
        // Combine with custom message if provided
        const finalHtml = message ? combineMessageWithEmail(message, emailHtml) : emailHtml;
        
        // Send email via Resend
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
        
        if (!RESEND_API_KEY) {
          console.error('[invoices-crud] RESEND_API_KEY not configured');
          return json({ error: 'Email service not configured' }, { status: 500 });
        }
        
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${businessData?.name || 'Your Business'} <${RESEND_FROM_EMAIL}>`,
            to: recipientEmail,
            subject: subject,
            html: finalHtml
          })
        });
        
        const resendData = await resendResponse.json();
        
        if (!resendResponse.ok) {
          console.error('[invoices-crud] Resend error:', resendData);
          return json({ error: 'Failed to send email', details: resendData }, { status: 500 });
        }
        
        console.log('[invoices-crud] Email sent successfully:', resendData.id);
        
        // Log to mail_sends table
        const requestHash = crypto.randomUUID();
        await supabase.from('mail_sends').insert({
          user_id: ctx.userId,
          invoice_id: invoiceId,
          request_hash: requestHash,
          to_email: recipientEmail,
          subject: subject,
          status: 'sent',
          provider_message_id: resendData.id
        });
        
        // Update invoice status to Sent if it was Draft
        if (invoiceData.status === 'Draft') {
          await supabase
            .from('invoices')
            .update({ status: 'Sent' })
            .eq('id', invoiceId)
            .eq('business_id', ctx.businessId);
        }
        
        return json({ success: true, messageId: resendData.id });
      }
      
      // Handle record payment action
      if (body.action === 'record_payment') {
        console.log('[invoices-crud] Recording payment for invoice:', body.invoiceId);
        
        const { invoiceId, amount, method, paidAt } = body;
        
        // Update invoice status to paid
        const { error: invoiceUpdateError } = await supabase
          .from('invoices')
          .update({ 
            status: 'Paid',
            paid_at: paidAt 
          })
          .eq('id', invoiceId)
          .eq('business_id', ctx.businessId);

        if (invoiceUpdateError) {
          console.error('[invoices-crud] Error updating invoice:', invoiceUpdateError);
          throw new Error('Failed to update invoice status');
        }

        // Create payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            owner_id: ctx.userId,
            invoice_id: invoiceId,
            amount: Math.round(amount * 100), // Convert to cents
            status: 'Succeeded',
            method: method,
            received_at: paidAt
          });

        if (paymentError) {
          console.error('[invoices-crud] Error creating payment record:', paymentError);
          throw new Error('Failed to create payment record');
        }

        return json({ success: true });
      }

      const { customerId, jobId, status, total, subtotal, taxRate, discount, dueAt, quoteId, 
              address, paymentTerms, frequency, depositRequired, depositPercent, 
              notesInternal, terms, lineItems } = body;

      let invoiceData: any = {
        business_id: ctx.businessId,
        owner_id: ctx.userId,
        status: status || 'Draft',
      };

      // If creating from a quote, fetch quote data and line items
      if (quoteId) {
        console.log('[invoices-crud] Creating invoice from quote:', quoteId);
        
        // Fetch the quote with all fields
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select(`
            customer_id, total, subtotal, tax_rate, discount, address,
            payment_terms, frequency, deposit_required, deposit_percent,
            notes_internal, terms
          `)
          .eq('id', quoteId)
          .eq('business_id', ctx.businessId)
          .single();

        if (quoteError) {
          console.error('[invoices-crud] Quote fetch error:', quoteError);
          throw new Error(`Failed to fetch quote: ${quoteError.message}`);
        }

        // Copy all quote data to invoice
        invoiceData.customer_id = quoteData.customer_id;
        invoiceData.total = quoteData.total;
        invoiceData.subtotal = quoteData.subtotal;
        invoiceData.tax_rate = quoteData.tax_rate;
        invoiceData.discount = quoteData.discount;
        invoiceData.address = quoteData.address;
        invoiceData.payment_terms = quoteData.payment_terms;
        invoiceData.frequency = quoteData.frequency;
        invoiceData.deposit_required = quoteData.deposit_required;
        invoiceData.deposit_percent = quoteData.deposit_percent;
        invoiceData.notes_internal = quoteData.notes_internal;
        invoiceData.terms = quoteData.terms;
        invoiceData.job_id = jobId;
        invoiceData.quote_id = quoteId;
        invoiceData.due_at = dueAt;
      } else {
        invoiceData.customer_id = customerId;
        invoiceData.job_id = jobId;
        invoiceData.quote_id = quoteId;
        invoiceData.total = total || 0;
        invoiceData.subtotal = subtotal || 0;
        invoiceData.tax_rate = taxRate || 0;
        invoiceData.discount = discount || 0;
        invoiceData.due_at = dueAt;
        invoiceData.address = address;
        invoiceData.payment_terms = paymentTerms;
        invoiceData.frequency = frequency;
        invoiceData.deposit_required = depositRequired || false;
        invoiceData.deposit_percent = depositPercent;
        invoiceData.notes_internal = notesInternal;
        invoiceData.terms = terms;

        // If linking to a job and no notes provided, inherit job notes
        if (jobId && !notesInternal) {
          const { data: jobData } = await supabase
            .from('jobs')
            .select('notes')
            .eq('id', jobId)
            .eq('business_id', ctx.businessId)
            .single();
          
          if (jobData?.notes) {
            invoiceData.notes_internal = jobData.notes;
          }
        }
      }

      // Get next invoice number
      const { data: numberData, error: numberError } = await supabase
        .rpc('next_inv_number', { p_business_id: ctx.businessId, p_user_id: ctx.userId });

      if (numberError) {
        console.error('[invoices-crud] Number generation error:', numberError);
        throw new Error(`Failed to generate invoice number: ${numberError.message}`);
      }

      invoiceData.number = numberData;

      // Create the invoice
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (error) {
        console.error('[invoices-crud] POST error:', error);
        throw new Error(`Failed to create invoice: ${error.message}`);
      }

      // If creating from a quote, copy line items
      if (quoteId) {
        console.log('[invoices-crud] Copying line items from quote to invoice');
        
        // Fetch quote line items
        const { data: quoteLineItems, error: lineItemsError } = await supabase
          .from('quote_line_items')
          .select('name, qty, unit, unit_price, line_total, position')
          .eq('quote_id', quoteId)
          .order('position');

        if (lineItemsError) {
          console.error('[invoices-crud] Line items fetch error:', lineItemsError);
          throw new Error(`Failed to fetch quote line items: ${lineItemsError.message}`);
        }

        // Create invoice line items
        if (quoteLineItems && quoteLineItems.length > 0) {
          const invoiceLineItems = quoteLineItems.map(item => ({
            invoice_id: data.id,
            owner_id: ctx.userId,
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            unit_price: item.unit_price,
            line_total: item.line_total,
            position: item.position
          }));

          const { error: insertLineItemsError } = await supabase
            .from('invoice_line_items')
            .insert(invoiceLineItems);

          if (insertLineItemsError) {
            console.error('[invoices-crud] Line items insert error:', insertLineItemsError);
            throw new Error(`Failed to create invoice line items: ${insertLineItemsError.message}`);
          }

          console.log('[invoices-crud] Created', invoiceLineItems.length, 'line items');
        }
      } else if (lineItems && lineItems.length > 0) {
        // Creating invoice manually with line items
        console.log('[invoices-crud] Creating manual invoice line items');
        
        const invoiceLineItems = lineItems.map((item: any, index: number) => ({
          invoice_id: data.id,
          owner_id: ctx.userId,
          name: item.name,
          qty: item.qty,
          unit: item.unit,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
          position: index
        }));

        const { error: insertLineItemsError } = await supabase
          .from('invoice_line_items')
          .insert(invoiceLineItems);

        if (insertLineItemsError) {
          console.error('[invoices-crud] Manual line items insert error:', insertLineItemsError);
          throw new Error(`Failed to create invoice line items: ${insertLineItemsError.message}`);
        }

        console.log('[invoices-crud] Created', invoiceLineItems.length, 'manual line items');
      }

      console.log('[invoices-crud] Invoice created:', data.id);
      return json({ invoice: data });
    }

    if (req.method === 'PUT') {
    const body = await req.json();
    const { id, status, total, subtotal, taxRate, discount, dueAt, paidAt, 
            address, paymentTerms, frequency, depositRequired, depositPercent, 
            notesInternal, terms, lineItems, jobId, quoteId } = body;

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (total !== undefined) updateData.total = total;
      if (subtotal !== undefined) updateData.subtotal = subtotal;
      if (taxRate !== undefined) updateData.tax_rate = taxRate;
      if (discount !== undefined) updateData.discount = discount;
      if (dueAt !== undefined) updateData.due_at = dueAt;
      if (paidAt !== undefined) updateData.paid_at = paidAt;
      if (address !== undefined) updateData.address = address;
      if (paymentTerms !== undefined) updateData.payment_terms = paymentTerms;
      if (frequency !== undefined) updateData.frequency = frequency;
      if (depositRequired !== undefined) updateData.deposit_required = depositRequired;
    if (depositPercent !== undefined) updateData.deposit_percent = depositPercent;
    if (notesInternal !== undefined) updateData.notes_internal = notesInternal;
    if (terms !== undefined) updateData.terms = terms;
    if (jobId !== undefined) updateData.job_id = jobId;
    if (quoteId !== undefined) updateData.quote_id = quoteId;

      // Handle line items update if provided
      if (lineItems && Array.isArray(lineItems)) {
        console.log('[invoices-crud] Updating line items for invoice:', id);
        
        // Delete existing line items
        const { error: deleteError } = await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', id);

        if (deleteError) {
          console.error('[invoices-crud] Error deleting existing line items:', deleteError);
          throw new Error(`Failed to delete existing line items: ${deleteError.message}`);
        }

        // Insert new line items
        if (lineItems.length > 0) {
          const invoiceLineItems = lineItems.map((item: any, index: number) => ({
            invoice_id: id,
            owner_id: ctx.userId,
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            unit_price: item.unitPrice,
            line_total: item.lineTotal,
            position: index
          }));

          const { error: insertError } = await supabase
            .from('invoice_line_items')
            .insert(invoiceLineItems);

          if (insertError) {
            console.error('[invoices-crud] Error inserting updated line items:', insertError);
            throw new Error(`Failed to insert updated line items: ${insertError.message}`);
          }

          console.log('[invoices-crud] Updated', invoiceLineItems.length, 'line items');
        }
      }

      // If linking to a job, check if invoice has notes and inherit job notes if empty
      if (jobId) {
        // First fetch the current invoice to check its notes_internal
        const { data: currentInvoice } = await supabase
          .from('invoices')
          .select('notes_internal')
          .eq('id', id)
          .eq('business_id', ctx.businessId)
          .single();
        
        // If invoice notes are empty and notesInternal wasn't explicitly sent in this update
        if ((!currentInvoice?.notes_internal || currentInvoice.notes_internal.trim() === '') 
            && notesInternal === undefined) {
          const { data: jobData } = await supabase
            .from('jobs')
            .select('notes')
            .eq('id', jobId)
            .eq('business_id', ctx.businessId)
            .single();
          
          if (jobData?.notes) {
            updateData.notes_internal = jobData.notes;
          }
        }
      }

      // If linking to a quote, check if invoice has terms and inherit quote terms if empty
      if (quoteId) {
        // First fetch the current invoice to check its terms
        const { data: currentInvoice } = await supabase
          .from('invoices')
          .select('terms')
          .eq('id', id)
          .eq('business_id', ctx.businessId)
          .single();
        
        // If invoice terms are empty and terms wasn't explicitly sent in this update
        if ((!currentInvoice?.terms || currentInvoice.terms.trim() === '') 
            && terms === undefined) {
          const { data: quoteData } = await supabase
            .from('quotes')
            .select('terms')
            .eq('id', quoteId)
            .eq('business_id', ctx.businessId)
            .single();
          
          if (quoteData?.terms) {
            updateData.terms = quoteData.terms;
          }
        }
      }

      let data;
      // Only perform update if there are fields to update beyond job_id/quote_id
      if (Object.keys(updateData).length > 0) {
        const { data: updatedData, error } = await supabase
          .from('invoices')
          .update(updateData)
          .eq('id', id)
          .eq('business_id', ctx.businessId)
          .select('id, number, total, subtotal, tax_rate, discount, status, due_at, paid_at, created_at, updated_at, public_token, job_id, quote_id, customer_id, address, payment_terms, frequency, deposit_required, deposit_percent, notes_internal, terms')
          .single();

        if (error) {
          console.error('[invoices-crud] PUT error:', error);
          throw new Error(`Failed to update invoice: ${error.message}`);
        }
        
        data = updatedData;
        console.log('[invoices-crud] Invoice updated:', data.id);
      } else {
        // No other fields to update, just fetch current state
        const { data: currentData, error } = await supabase
          .from('invoices')
          .select('id, number, total, subtotal, tax_rate, discount, status, due_at, paid_at, created_at, updated_at, public_token, job_id, quote_id, customer_id, address, payment_terms, frequency, deposit_required, deposit_percent, notes_internal, terms')
          .eq('id', id)
          .eq('business_id', ctx.businessId)
          .single();

        if (error) {
          console.error('[invoices-crud] GET error:', error);
          throw new Error(`Failed to fetch invoice: ${error.message}`);
        }
        
        data = currentData;
        console.log('[invoices-crud] Invoice fetched after link:', data.id);
      }

      // Transform to camelCase to match GET endpoint format
      const transformedInvoice = {
        id: data.id,
        number: data.number,
        total: data.total,
        subtotal: data.subtotal,
        taxRate: data.tax_rate,
        discount: data.discount,
        status: data.status,
        dueAt: data.due_at,
        paidAt: data.paid_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        publicToken: data.public_token,
        customerId: data.customer_id,
        jobId: data.job_id,
        quoteId: data.quote_id,
        address: data.address,
        paymentTerms: data.payment_terms,
        frequency: data.frequency,
        depositRequired: data.deposit_required || false,
        depositPercent: data.deposit_percent,
        notesInternal: data.notes_internal,
        terms: data.terms
      };

      return json({ invoice: transformedInvoice });
    }

    if (req.method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('business_id', ctx.businessId);

      if (error) {
        console.error('[invoices-crud] DELETE error:', error);
        throw new Error(`Failed to delete invoice: ${error.message}`);
      }

      console.log('[invoices-crud] Invoice deleted:', id);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[invoices-crud] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { Resend } from 'npm:resend@4.0.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';
import { generateQuoteEmail, combineMessageWithEmail } from '../_shared/quoteEmailTemplate.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[quotes-crud] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[quotes-crud] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    // Use service role client from context for RLS bypass
    const supabase = ctx.supaAdmin;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const quoteId = url.searchParams.get('id');

      if (quoteId) {
        // Fetch individual quote by ID
        const { data, error } = await supabase
          .from('quotes')
          .select(`
            id, number, total, status, updated_at, public_token, view_count,
            customer_id, address, tax_rate, discount, subtotal,
            terms, payment_terms, frequency, deposit_required, deposit_percent,
            notes_internal, customer_notes, files, sent_at, created_at,
            customers!inner(name, email)
          `)
          .eq('id', quoteId)
          .eq('business_id', ctx.businessId)
          .single();

        if (error) {
          console.error('[quotes-crud] GET single quote error:', error);
          throw new Error(`Failed to fetch quote: ${error.message}`);
        }

        // Fetch line items for this quote
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from('quote_line_items')
          .select('id, name, qty, unit, unit_price, line_total, position')
          .eq('quote_id', quoteId)
          .order('position');

        if (lineItemsError) {
          console.error('[quotes-crud] GET line items error:', lineItemsError);
          throw new Error(`Failed to fetch line items: ${lineItemsError.message}`);
        }

        // Map line items to frontend format
        const lineItems = (lineItemsData || []).map((item: {
          id: string;
          name: string;
          qty: number;
          unit: string | null;
          unit_price: number;
          line_total: number;
        }) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          unit: item.unit,
          unitPrice: item.unit_price,
          lineTotal: item.line_total
        }));

        const quote = {
          id: data.id,
          number: data.number,
          businessId: ctx.businessId,
          customerId: data.customer_id,
          address: data.address,
          lineItems: lineItems,
          taxRate: data.tax_rate,
          discount: data.discount,
          subtotal: data.subtotal,
          total: data.total,
          status: data.status,
          files: data.files || [],
          notesInternal: data.notes_internal,
          customerNotes: data.customer_notes,
          terms: data.terms,
          paymentTerms: data.payment_terms,
          frequency: data.frequency,
          depositRequired: data.deposit_required,
          depositPercent: data.deposit_percent,
          sentAt: data.sent_at,
          viewCount: data.view_count ?? 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          publicToken: data.public_token,
        };

        console.log('[quotes-crud] Fetched quote:', data.id);
        return json(quote);
      } else {
        // Fetch all quotes
        const { data, error, count } = await supabase
          .from('quotes')
          .select(`
            id, number, total, status, updated_at, public_token, view_count,
            customer_id, sent_at, terms,
            customers!inner(name, email)
          `, { count: 'exact' })
          .eq('business_id', ctx.businessId)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('[quotes-crud] GET error:', error);
          throw new Error(`Failed to fetch quotes: ${error.message}`);
        }

        const quotes = data?.map((quote: any) => ({
          id: quote.id,
          number: quote.number,
          total: quote.total,
          status: quote.status,
          updatedAt: quote.updated_at,
          publicToken: quote.public_token,
          viewCount: quote.view_count ?? 0,
          customerId: quote.customer_id,
          customerName: quote.customers?.name,
          customerEmail: quote.customers?.email,
          sentAt: quote.sent_at,
          terms: quote.terms,
        })) || [];

        console.log('[quotes-crud] Fetched', quotes.length, 'quotes');
        return json({ quotes, count: count || 0 });
      }
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[quotes-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { customerId, status, total, subtotal, taxRate, discount, terms, address, lineItems, paymentTerms, frequency, depositRequired, depositPercent, notesInternal, isSubscription } = body;

      // Get next quote number using service role client
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('est_prefix, est_seq')
        .eq('id', ctx.businessId)
        .single();

      if (businessError || !businessData) {
        console.error('[quotes-crud] Business fetch error:', businessError);
        throw new Error('Failed to fetch business data for quote numbering');
      }

      // Increment sequence number
      const newSeq = businessData.est_seq + 1;
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ est_seq: newSeq })
        .eq('id', ctx.businessId);

      if (updateError) {
        console.error('[quotes-crud] Sequence update error:', updateError);
        throw new Error('Failed to update quote sequence number');
      }

      const quoteNumber = businessData.est_prefix + newSeq.toString().padStart(3, '0');

      // Calculate totals from line items
      let calculatedSubtotal = 0;
      let calculatedTotal = 0;
      
      if (lineItems && Array.isArray(lineItems)) {
        calculatedSubtotal = lineItems.reduce((sum: number, item: Record<string, unknown>) => sum + (item.lineTotal as number || 0), 0);
        calculatedTotal = calculatedSubtotal + Math.round(calculatedSubtotal * (taxRate || 0)) - (discount || 0);
      }

      const { data, error } = await supabase
        .from('quotes')
        .insert([{
          business_id: ctx.businessId,
          owner_id: ctx.userId,
          customer_id: customerId,
          number: quoteNumber,
          status: status || 'Draft',
          total: calculatedTotal,
          subtotal: calculatedSubtotal,
          tax_rate: taxRate || 0,
          discount: discount || 0,
          terms,
          address,
          payment_terms: paymentTerms,
          frequency,
          deposit_required: depositRequired,
          deposit_percent: depositPercent,
          notes_internal: notesInternal,
          is_subscription: isSubscription || false
        }])
        .select()
        .single();

      if (error) {
        console.error('[quotes-crud] POST error:', error);
        throw new Error(`Failed to create quote: ${error.message}`);
      }

      // Save line items if provided
      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        const lineItemsToInsert = lineItems.map((item: Record<string, unknown>, index: number) => ({
          quote_id: data.id,
          owner_id: ctx.userId,
          name: item.name as string || '',
          qty: item.qty as number || 1,
          unit: item.unit as string || null,
          unit_price: item.unitPrice as number || 0,
          line_total: item.lineTotal as number || 0,
          position: index
        }));

        const { error: lineItemError } = await supabase
          .from('quote_line_items')
          .insert(lineItemsToInsert);

        if (lineItemError) {
          console.error('[quotes-crud] Line items insert error:', lineItemError);
          // Delete the quote if line items failed to save
          await supabase
            .from('quotes')
            .delete()
            .eq('id', data.id);
          throw new Error(`Failed to save line items: ${lineItemError.message}`);
        }

        console.log('[quotes-crud] Saved', lineItems.length, 'line items for quote:', data.id);
      }

      console.log('[quotes-crud] Quote created:', data.id);
      return json({ quote: data });
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[quotes-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id, status, total, subtotal, taxRate, discount, terms, address, viewCount, lineItems, paymentTerms, frequency, depositRequired, depositPercent, notesInternal } = body;

      const updateData: Record<string, unknown> = {};
      if (status !== undefined) updateData.status = status;
      if (total !== undefined) updateData.total = total;
      if (subtotal !== undefined) updateData.subtotal = subtotal;
      if (taxRate !== undefined) updateData.tax_rate = taxRate;
      if (discount !== undefined) updateData.discount = discount;
      if (terms !== undefined) updateData.terms = terms;
      if (address !== undefined) updateData.address = address;
      if (viewCount !== undefined) updateData.view_count = viewCount;
      // Line items are stored in separate table - skip this field
      if (paymentTerms !== undefined) updateData.payment_terms = paymentTerms;
      if (frequency !== undefined) updateData.frequency = frequency;
      if (depositRequired !== undefined) updateData.deposit_required = depositRequired;
      if (depositPercent !== undefined) updateData.deposit_percent = depositPercent;
      if (notesInternal !== undefined) updateData.notes_internal = notesInternal;

      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', id)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) {
        console.error('[quotes-crud] PUT error:', error);
        throw new Error(`Failed to update quote: ${error.message}`);
      }

      console.log('[quotes-crud] Quote updated:', data.id);
      return json({ quote: data });
    }

    if (req.method === 'DELETE') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[quotes-crud] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }
      
      const { id } = body;

      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id)
        .eq('business_id', ctx.businessId);

      if (error) {
        console.error('[quotes-crud] DELETE error:', error);
        throw new Error(`Failed to delete quote: ${error.message}`);
      }

      console.log('[quotes-crud] Quote deleted:', id);
      return json({ success: true });
    }

    if (req.method === 'PATCH') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');
      
      if (action === 'send-email') {
        let body;
        try {
          body = await req.json();
          if (!body) {
            throw new Error('Request body is empty');
          }
        } catch (jsonError) {
          console.error('[quotes-crud] JSON parsing error:', jsonError);
          return json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }

        const { quoteId, to, subject, message } = body;

        // 1. Fetch quote with full details
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select(`
            id, number, total, status, public_token, customer_id, address,
            tax_rate, discount, subtotal, terms, payment_terms, frequency,
            deposit_required, deposit_percent, notes_internal, is_subscription,
            customers!inner(name, email)
          `)
          .eq('id', quoteId)
          .eq('business_id', ctx.businessId)
          .single();

        if (quoteError) {
          console.error('[quotes-crud] Quote fetch error:', quoteError);
          throw new Error(`Quote not found: ${quoteError.message}`);
        }

        // 2. Fetch line items
        const { data: lineItems, error: lineItemsError } = await supabase
          .from('quote_line_items')
          .select('*')
          .eq('quote_id', quoteId)
          .order('position');

        if (lineItemsError) {
          console.error('[quotes-crud] Line items fetch error:', lineItemsError);
          throw new Error(`Failed to fetch line items: ${lineItemsError.message}`);
        }

        // 3. Fetch business details
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('name, logo_url, light_logo_url')
          .eq('id', ctx.businessId)
          .single();

        if (businessError) {
          console.error('[quotes-crud] Business fetch error:', businessError);
          throw new Error(`Failed to fetch business data: ${businessError.message}`);
        }

        // 4. Transform data to match Quote type and generate email HTML
        const quoteForEmail = {
          id: quoteData.id,
          number: quoteData.number,
          total: quoteData.total,
          subtotal: quoteData.subtotal,
          taxRate: quoteData.tax_rate,
          discount: quoteData.discount,
          status: quoteData.status,
          address: quoteData.address,
          terms: quoteData.terms,
          paymentTerms: quoteData.payment_terms,
          frequency: quoteData.frequency,
          depositRequired: quoteData.deposit_required,
          depositPercent: quoteData.deposit_percent,
          publicToken: quoteData.public_token,
          createdAt: quoteData.created_at,
          lineItems: (lineItems || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            unitPrice: item.unit_price,
            lineTotal: item.line_total
          }))
        };

        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://servicegrid.app';
        
        // Generate base email
        const { html: baseHtml, subject: defaultSubject } = generateQuoteEmail({
          businessName: businessData.name,
          businessLogoUrl: businessData.light_logo_url || businessData.logo_url,
          customerName: (quoteData.customers as any)?.name,
          quote: quoteForEmail,
          approveUrl: `${frontendUrl}/quote-action?type=approve&quote_id=${quoteData.id}&token=${quoteData.public_token}`,
          editUrl: `${frontendUrl}/quote-edit/${quoteData.id}/${quoteData.public_token}`,
          pixelUrl: `${frontendUrl}/quote-action?type=open&quote_id=${quoteData.id}&token=${quoteData.public_token}`
        });

        // Combine with custom message if provided
        const emailHtml = message?.trim() 
          ? combineMessageWithEmail(message, baseHtml)
          : baseHtml;

        // Use provided subject or default
        const emailSubject = subject || defaultSubject;

        // 5. Send email via Resend
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
        let emailResult = null;
        let emailError = null;

        try {
          const result = await resend.emails.send({
            from: `${businessData.name} <${Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'}>`,
            to: [to],
            subject: emailSubject,
            html: emailHtml
          });
          emailResult = result.data;
          emailError = result.error;
        } catch (error) {
          console.error('[quotes-crud] Resend error:', error);
          emailError = error;
        }

        // 6. Log to mail_sends table
        await supabase.from('mail_sends').insert({
          user_id: ctx.userId,
          quote_id: quoteId,
          to_email: to,
          subject: subject,
          request_hash: crypto.randomUUID(),
          status: emailError ? 'failed' : 'sent',
          provider_message_id: emailResult?.id || null,
          error_code: emailError?.name || null,
          error_message: emailError?.message || null
        });

        // 7. Update quote status to "Sent" and set sent_at timestamp
        if (!emailError) {
          await supabase
            .from('quotes')
            .update({ 
              status: 'Sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', quoteId)
            .eq('business_id', ctx.businessId);

          console.log('[quotes-crud] Quote marked as sent:', quoteId);
        }

        if (emailError) {
          console.error('[quotes-crud] Email send failed:', emailError);
          throw new Error(`Failed to send email: ${emailError.message || 'Unknown error'}`);
        }

        console.log('[quotes-crud] Email sent successfully:', emailResult?.id);
        return json({ success: true, messageId: emailResult?.id });
      }

      return json({ error: 'Unknown action' }, { status: 400 });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: unknown) {
    console.error('[quotes-crud] Error:', error);
    return json(
      { error: (error as Error).message || 'Failed to process request' },
      { status: 500 }
    );
  }
});

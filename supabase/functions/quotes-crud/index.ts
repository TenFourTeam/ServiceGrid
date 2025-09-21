import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const quoteId = url.searchParams.get('id');
      const action = url.searchParams.get('action');
      
      // Handle subscription status check
      if (action === 'subscription-status') {
        const body = await req.json().catch(() => ({}));
        const customerId = body.customerId;
        
        if (!customerId) {
          return json({ error: 'Customer ID is required' }, { status: 400 });
        }

        // Get active subscription info
        const { data: subscriptionInfo, error: subError } = await supabase.rpc(
          'get_active_subscription_info',
          {
            p_customer_id: customerId,
            p_business_id: ctx.businessId
          }
        );

        if (subError) {
          console.error('[quotes-crud] Subscription info error:', subError);
          // Don't fail, just return no active subscription
        }

        // Get superseded quotes
        const { data: supersededQuotes, error: supersededError } = await supabase
          .from('quotes')
          .select('id, number, superseded_at, superseded_by_quote_id')
          .eq('customer_id', customerId)
          .eq('business_id', ctx.businessId)
          .eq('is_active', false)
          .not('superseded_at', 'is', null)
          .order('superseded_at', { ascending: false });

        if (supersededError) {
          console.error('[quotes-crud] Superseded quotes error:', supersededError);
        }

        const result = {
          hasActiveSubscription: !!subscriptionInfo && subscriptionInfo.length > 0,
          activeSubscriptionInfo: subscriptionInfo?.[0] ? {
            quoteId: subscriptionInfo[0].quote_id,
            subscriptionId: subscriptionInfo[0].subscription_id,
            frequency: subscriptionInfo[0].frequency,
            nextBillingDate: subscriptionInfo[0].next_billing_date
          } : undefined,
          supersededQuotes: supersededQuotes || []
        };

        return json(result);
      }

      if (quoteId) {
        // Fetch individual quote by ID
        const { data, error } = await supabase
          .from('quotes')
          .select(`
            id, number, total, status, updated_at, public_token, view_count,
            customer_id, address, tax_rate, discount, subtotal,
            terms, payment_terms, frequency, deposit_required, deposit_percent,
            notes_internal, files, sent_at, created_at,
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
        const lineItems = (lineItemsData || []).map(item => ({
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
            customer_id, sent_at,
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

      // Check if sending a quote (not just creating draft)
      const isSending = status === 'Sent';

      // Get next quote number - direct database operation like customers-crud
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('est_prefix, est_seq')
        .eq('id', ctx.businessId)
        .eq('owner_id', ctx.userId)
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
        .eq('id', ctx.businessId)
        .eq('owner_id', ctx.userId);

      if (updateError) {
        console.error('[quotes-crud] Sequence update error:', updateError);
        throw new Error('Failed to update quote sequence number');
      }

      const quoteNumber = businessData.est_prefix + newSeq.toString().padStart(3, '0');

      // Calculate totals from line items
      let calculatedSubtotal = 0;
      let calculatedTotal = 0;
      
      if (lineItems && Array.isArray(lineItems)) {
        calculatedSubtotal = lineItems.reduce((sum: number, item: any) => sum + (item.lineTotal || 0), 0);
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
          is_subscription: isSubscription || false,
          // Generate new token when sending
          public_token: isSending ? crypto.randomUUID() : undefined
        }])
        .select()
        .single();

      if (error) {
        console.error('[quotes-crud] POST error:', error);
        throw new Error(`Failed to create quote: ${error.message}`);
      }

      // If sending this quote, supersede previous ones
      if (isSending && customerId) {
        console.log('[quotes-crud] Superseding previous quotes for customer:', customerId);
        const { error: supersedeError } = await supabase.rpc('supersede_previous_quotes', {
          p_customer_id: customerId,
          p_business_id: ctx.businessId,
          p_new_quote_id: data.id,
          p_is_subscription: isSubscription || false
        });

        if (supersedeError) {
          console.error('[quotes-crud] Error superseding quotes:', supersedeError);
          // Don't fail the request, just log the error
        }
      }

      if (error) {
        console.error('[quotes-crud] POST error:', error);
        throw new Error(`Failed to create quote: ${error.message}`);
      }

      // Save line items if provided
      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        const lineItemsToInsert = lineItems.map((item: any, index: number) => ({
          quote_id: data.id,
          owner_id: ctx.userId,
          name: item.name || '',
          qty: item.qty || 1,
          unit: item.unit || null,
          unit_price: item.unitPrice || 0,
          line_total: item.lineTotal || 0,
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

      // Check if this update is sending the quote
      const isSending = status === 'Sent';
      
      const updateData: any = {};
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
      
      // Generate new token if sending
      if (isSending) {
        updateData.public_token = crypto.randomUUID();
      }

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

      // If sending this quote, supersede previous ones
      if (isSending && data.customer_id) {
        console.log('[quotes-crud] Superseding previous quotes for customer:', data.customer_id);
        const { error: supersedeError } = await supabase.rpc('supersede_previous_quotes', {
          p_customer_id: data.customer_id,
          p_business_id: data.business_id,
          p_new_quote_id: data.id,
          p_is_subscription: data.is_subscription || false
        });

        if (supersedeError) {
          console.error('[quotes-crud] Error superseding quotes:', supersedeError);
          // Don't fail the request, just log the error
        }
      }

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

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[quotes-crud] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});
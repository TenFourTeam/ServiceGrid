import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;
    const businessId = ctx.businessId;

    const url = new URL(req.url);
    const scheduleId = url.searchParams.get('scheduleId');

    if (req.method === 'GET') {
      if (scheduleId) {
        // Get single schedule with invoice history
        const { data: schedule, error: scheduleError } = await supabase
          .from('recurring_schedules')
          .select(`
            *,
            customer:customers(id, name, email),
            quote:quotes(id, number, total)
          `)
          .eq('id', scheduleId)
          .eq('business_id', businessId)
          .single();

        if (scheduleError) throw scheduleError;

        // Get invoices generated from this schedule
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('id, number, total, status, created_at, paid_at')
          .eq('recurring_schedule_id', scheduleId)
          .order('created_at', { ascending: false });

        if (invoicesError) throw invoicesError;

        return new Response(
          JSON.stringify({ schedule, invoices }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // List all active recurring schedules
        const { data: schedules, error } = await supabase
          .from('recurring_schedules')
          .select(`
            id,
            customer_id,
            quote_id,
            frequency,
            next_billing_date,
            last_invoice_date,
            total_invoices_generated,
            is_active,
            stripe_subscription_id,
            created_at,
            customer:customers(id, name, email),
            quote:quotes(id, number, total, subtotal, tax_rate, discount)
          `)
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('next_billing_date', { ascending: true });

        if (error) throw error;

        // Transform data to include calculated amount
        const transformedSchedules = schedules?.map(schedule => ({
          ...schedule,
          customer_name: schedule.customer?.name,
          customer_email: schedule.customer?.email,
          quote_number: schedule.quote?.number,
          amount: schedule.quote?.total || 0,
        })) || [];

        return new Response(
          JSON.stringify({ schedules: transformedSchedules }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action, scheduleId } = body;

      if (action === 'generate_next') {
        if (!scheduleId) {
          throw new Error('Missing scheduleId');
        }

        // Get schedule details
        const { data: schedule, error: scheduleError } = await supabase
          .from('recurring_schedules')
          .select(`
            *,
            quote:quotes(*)
          `)
          .eq('id', scheduleId)
          .eq('business_id', businessId)
          .single();

        if (scheduleError) throw scheduleError;
        if (!schedule) throw new Error('Schedule not found');

        // Get the original quote to copy line items
        const { data: lineItems, error: lineItemsError } = await supabase
          .from('quote_line_items')
          .select('*')
          .eq('quote_id', schedule.quote_id)
          .order('position');

        if (lineItemsError) throw lineItemsError;

        // Generate invoice number
        const { data: invoiceNumber, error: numberError } = await supabase
          .rpc('next_inv_number', { 
            p_business_id: businessId,
            p_user_id: ctx.userId 
          });

        if (numberError) throw numberError;

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            number: invoiceNumber,
            business_id: businessId,
            owner_id: ctx.userId,
            customer_id: schedule.customer_id,
            quote_id: schedule.quote_id,
            recurring_schedule_id: scheduleId,
            status: 'Sent',
            subtotal: schedule.quote.subtotal,
            discount: schedule.quote.discount,
            tax_rate: schedule.quote.tax_rate,
            total: schedule.quote.total,
            frequency: schedule.frequency,
            terms: schedule.quote.terms,
            address: schedule.quote.address,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Copy line items
        const invoiceLineItems = lineItems?.map(item => ({
          invoice_id: invoice.id,
          owner_id: ctx.userId,
          name: item.name,
          qty: item.qty,
          unit: item.unit,
          unit_price: item.unit_price,
          line_total: item.line_total,
          position: item.position,
        }));

        if (invoiceLineItems && invoiceLineItems.length > 0) {
          const { error: lineItemError } = await supabase
            .from('invoice_line_items')
            .insert(invoiceLineItems);

          if (lineItemError) throw lineItemError;
        }

        // Calculate next billing date based on frequency
        const currentDate = new Date(schedule.next_billing_date);
        let nextDate = new Date(currentDate);
        
        switch (schedule.frequency) {
          case 'Weekly':
            nextDate.setDate(currentDate.getDate() + 7);
            break;
          case 'Monthly':
            nextDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'Quarterly':
            nextDate.setMonth(currentDate.getMonth() + 3);
            break;
          case 'Yearly':
            nextDate.setFullYear(currentDate.getFullYear() + 1);
            break;
        }

        // Update schedule
        const { error: updateError } = await supabase
          .from('recurring_schedules')
          .update({
            last_invoice_date: new Date().toISOString(),
            total_invoices_generated: (schedule.total_invoices_generated || 0) + 1,
            next_billing_date: nextDate.toISOString(),
          })
          .eq('id', scheduleId);

        if (updateError) throw updateError;

        console.log(`Generated invoice ${invoiceNumber} from schedule ${scheduleId}`);

        return new Response(
          JSON.stringify({ invoice, nextBillingDate: nextDate.toISOString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Invalid action');
    }

    if (req.method === 'PATCH') {
      const { action, scheduleId } = await req.json();
      
      if (action === 'pause') {
        const { error } = await supabase
          .from('recurring_schedules')
          .update({ is_active: false })
          .eq('id', scheduleId);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (action === 'resume') {
        const { error } = await supabase
          .from('recurring_schedules')
          .update({ is_active: true })
          .eq('id', scheduleId);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const scheduleId = url.searchParams.get('id');
      
      const { error } = await supabase
        .from('recurring_schedules')
        .update({ is_active: false })
        .eq('id', scheduleId);
      
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Method not allowed');
  } catch (error) {
    console.error('Error in recurring-schedules-crud:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[auto-generate-recurring-invoices] Starting cron job');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    console.log(`[auto-generate-recurring-invoices] Checking for schedules due on or before: ${todayISO}`);

    // Find all active recurring schedules that are due
    const { data: dueSchedules, error: schedulesError } = await supabase
      .from('recurring_schedules')
      .select(`
        *,
        customer:customers(id, name, email),
        quote:quotes(id, number, line_items)
      `)
      .lte('next_billing_date', todayISO)
      .eq('is_active', true);

    if (schedulesError) {
      console.error('[auto-generate-recurring-invoices] Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    console.log(`[auto-generate-recurring-invoices] Found ${dueSchedules?.length || 0} schedules to process`);

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as any[],
    };

    if (!dueSchedules || dueSchedules.length === 0) {
      console.log('[auto-generate-recurring-invoices] No schedules due for billing');
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each schedule
    for (const schedule of dueSchedules) {
      try {
        console.log(`[auto-generate-recurring-invoices] Processing schedule ${schedule.id} for customer ${schedule.customer?.name}`);

        // Get the next invoice number
        const { data: invoiceNumber, error: numberError } = await supabase.rpc(
          'next_inv_number',
          {
            p_business_id: schedule.business_id,
            p_user_id: schedule.quote.owner_id || schedule.business_id, // Fallback to business_id if no owner
          }
        );

        if (numberError) {
          console.error(`[auto-generate-recurring-invoices] Error getting invoice number for schedule ${schedule.id}:`, numberError);
          results.failed++;
          results.errors.push({ schedule_id: schedule.id, error: numberError.message });
          continue;
        }

        // Create the invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            business_id: schedule.business_id,
            customer_id: schedule.customer_id,
            quote_id: schedule.quote_id,
            recurring_schedule_id: schedule.id,
            number: invoiceNumber,
            status: 'Sent',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            notes: `Automatically generated from recurring schedule. Frequency: ${schedule.frequency}`,
          })
          .select()
          .single();

        if (invoiceError) {
          console.error(`[auto-generate-recurring-invoices] Error creating invoice for schedule ${schedule.id}:`, invoiceError);
          results.failed++;
          results.errors.push({ schedule_id: schedule.id, error: invoiceError.message });
          continue;
        }

        console.log(`[auto-generate-recurring-invoices] Created invoice ${newInvoice.id} with number ${invoiceNumber}`);

        // Copy line items from the quote
        if (schedule.quote?.line_items && Array.isArray(schedule.quote.line_items)) {
          const lineItemsToInsert = schedule.quote.line_items.map((item: any) => ({
            invoice_id: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
          }));

          const { error: lineItemsError } = await supabase
            .from('invoice_line_items')
            .insert(lineItemsToInsert);

          if (lineItemsError) {
            console.error(`[auto-generate-recurring-invoices] Error creating line items for invoice ${newInvoice.id}:`, lineItemsError);
            results.failed++;
            results.errors.push({ schedule_id: schedule.id, invoice_id: newInvoice.id, error: lineItemsError.message });
            continue;
          }
        }

        // Calculate next billing date based on frequency
        const currentBillingDate = new Date(schedule.next_billing_date);
        let nextBillingDate: Date;

        switch (schedule.frequency) {
          case 'weekly':
            nextBillingDate = new Date(currentBillingDate.setDate(currentBillingDate.getDate() + 7));
            break;
          case 'bi_weekly':
            nextBillingDate = new Date(currentBillingDate.setDate(currentBillingDate.getDate() + 14));
            break;
          case 'monthly':
            nextBillingDate = new Date(currentBillingDate.setMonth(currentBillingDate.getMonth() + 1));
            break;
          case 'quarterly':
            nextBillingDate = new Date(currentBillingDate.setMonth(currentBillingDate.getMonth() + 3));
            break;
          case 'semi_annual':
            nextBillingDate = new Date(currentBillingDate.setMonth(currentBillingDate.getMonth() + 6));
            break;
          case 'annual':
            nextBillingDate = new Date(currentBillingDate.setFullYear(currentBillingDate.getFullYear() + 1));
            break;
          default:
            nextBillingDate = new Date(currentBillingDate.setMonth(currentBillingDate.getMonth() + 1));
        }

        // Update the recurring schedule
        const { error: updateError } = await supabase
          .from('recurring_schedules')
          .update({
            next_billing_date: nextBillingDate.toISOString(),
            last_invoice_date: new Date().toISOString(),
            total_invoices_generated: (schedule.total_invoices_generated || 0) + 1,
          })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`[auto-generate-recurring-invoices] Error updating schedule ${schedule.id}:`, updateError);
          results.failed++;
          results.errors.push({ schedule_id: schedule.id, error: updateError.message });
          continue;
        }

        console.log(`[auto-generate-recurring-invoices] Successfully processed schedule ${schedule.id}. Next billing: ${nextBillingDate.toISOString()}`);
        results.processed++;

      } catch (error: any) {
        console.error(`[auto-generate-recurring-invoices] Unexpected error processing schedule ${schedule.id}:`, error);
        results.failed++;
        results.errors.push({ schedule_id: schedule.id, error: error.message });
      }
    }

    console.log(`[auto-generate-recurring-invoices] Cron job completed. Processed: ${results.processed}, Failed: ${results.failed}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[auto-generate-recurring-invoices] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

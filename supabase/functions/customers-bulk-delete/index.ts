import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CustomerDeleteRequest {
  id: string;
}

function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

Deno.serve(async (req) => {
  console.log(`[customers-bulk-delete] ${req.method} request to ${req.url}`);
  console.log(`[customers-bulk-delete] Headers:`, Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return badRequest('Method not allowed', 405);
  }

  try {
    console.log(`[customers-bulk-delete] Starting authentication check...`);
    const authHeader = req.headers.get('Authorization');
    console.log(`[customers-bulk-delete] Auth header present:`, !!authHeader);
    console.log(`[customers-bulk-delete] Auth header preview:`, authHeader?.substring(0, 20) + '...');
    
    const ctx = await requireCtx(req);
    console.log(`[customers-bulk-delete] Authentication validated for business: ${ctx.businessId}`);

    const body = (await req.json().catch(() => ({}))) as {
      customerIds: string[];
    };

    if (!body.customerIds || !Array.isArray(body.customerIds) || body.customerIds.length === 0) {
      return badRequest('customerIds array is required and must not be empty');
    }

    console.log(`[customers-bulk-delete] Processing ${body.customerIds.length} customer deletions for business ${ctx.businessId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results = [];
    const errors = [];

    // Process each deletion individually to handle partial failures
    for (const customerId of body.customerIds) {
      try {
        // Verify customer exists and belongs to the business
        const { data: existingCustomer, error: fetchError } = await supabase
          .from('customers')
          .select('id, name, business_id')
          .eq('id', customerId)
          .eq('business_id', ctx.businessId)
          .single();

        if (fetchError || !existingCustomer) {
          console.warn(`[customers-bulk-delete] Customer ${customerId} not found or doesn't belong to business`);
          errors.push({ id: customerId, error: 'Customer not found or access denied' });
          continue;
        }

        // Execute the deletion
        const { error: deleteError } = await supabase
          .from('customers')
          .delete()
          .eq('id', customerId)
          .eq('business_id', ctx.businessId);

        if (deleteError) {
          console.error(`[customers-bulk-delete] Failed to delete customer ${customerId}:`, deleteError);
          errors.push({ id: customerId, error: deleteError.message });
        } else {
          console.log(`[customers-bulk-delete] Successfully deleted customer ${customerId} (${existingCustomer.name})`);
          results.push({ 
            id: customerId, 
            name: existingCustomer.name,
            success: true 
          });
        }

      } catch (error) {
        console.error(`[customers-bulk-delete] Error processing customer ${customerId}:`, error);
        errors.push({ 
          id: customerId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const response = {
      success: errors.length === 0,
      deleted: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`[customers-bulk-delete] Batch deletion completed: ${results.length} successful, ${errors.length} failed`);

    return json(response, { 
      status: errors.length === 0 ? 200 : 207 // 207 Multi-Status for partial success
    });

  } catch (error) {
    console.error('[customers-bulk-delete] Unexpected error:', error);
    return json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});
// Supabase Edge Function: customers
// Uses shared auth helper for consistent business context resolution

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

function serializeError(e: unknown, context?: string) {
  console.error(`[customers] Error in ${context || 'unknown context'}:`, e);
  
  if (e instanceof Error) {
    return { 
      message: e.message, 
      name: e.name,
      stack: e.stack,
      context: context || 'unknown'
    };
  }
  
  // Handle Supabase errors which often have specific structure
  if (typeof e === 'object' && e !== null) {
    const errorObj = e as any;
    if (errorObj.message) {
      return {
        message: errorObj.message,
        code: errorObj.code || 'unknown_code',
        details: errorObj.details || 'No additional details',
        hint: errorObj.hint || null,
        context: context || 'unknown'
      };
    }
  }
  
  try {
    const serialized = JSON.parse(JSON.stringify(e));
    return { 
      message: String(e), 
      serialized,
      context: context || 'unknown'
    };
  } catch {
    return { 
      message: String(e),
      context: context || 'unknown',
      note: 'Could not serialize error object'
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`[customers] ${req.method} request received`);
    const ctx = await requireCtx(req);
    const { userId, businessId, supaAdmin } = ctx;
    console.log(`[customers] Context resolved: userId=${userId}, businessId=${businessId}`);

    if (req.method === "GET") {
      console.log(`[customers] Fetching customers for business: ${businessId}`);
      
      // Check if this is a count-only request
      const url = new URL(req.url);
      const countOnly = url.searchParams.get("count") === "true";
      
      if (countOnly) {
        const { count, error } = await supaAdmin
          .from("customers")
          .select("id", { count: 'exact', head: true })
          .eq("business_id", businessId);
        if (error) {
          console.error(`[customers] Database error in GET count:`, error);
          throw error;
        }
        console.log(`[customers] Successfully counted ${count || 0} customers`);
        return json({ count: count || 0 });
      }
      
      const { data, error } = await supaAdmin
        .from("customers")
        .select("id,name,email,phone,address")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error(`[customers] Database error in GET:`, error);
        throw error;
      }
      console.log(`[customers] Successfully fetched ${(data || []).length} customers`);
      return json({ rows: data || [] });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const name = (body.name || "").toString().trim();
      const email = (body.email ?? null) ? String(body.email).trim().toLowerCase() : null;
      const phone = (body.phone ?? null) ? String(body.phone).trim() : null;
      const address = (body.address ?? null) ? String(body.address).trim() : null;
      
      if (!name) return badRequest("Name is required");
      if (!email) return badRequest("Email is required");
      
      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) return badRequest("Invalid email format");

      // Check for duplicate name + email combination within the business
      const { data: existingCustomer } = await supaAdmin
        .from("customers")
        .select("id")
        .eq("business_id", businessId)
        .eq("name", name)
        .eq("email", email)
        .single();
      
      if (existingCustomer) {
        return badRequest("A customer with this name and email already exists");
      }

      const { data, error } = await supaAdmin
        .from("customers")
        .insert({ name, email, phone, address, owner_id: userId, business_id: businessId })
        .select("id, name, email, phone, address")
        .single();
      if (error) throw error;

      // Log audit action
      await supaAdmin.rpc('log_audit_action', {
        p_business_id: businessId,
        p_user_id: userId,
        p_action: 'create',
        p_resource_type: 'customer',
        p_resource_id: data.id,
        p_details: { name, email }
      });

      return json({ 
        id: data.id, 
        name: data.name, 
        email: data.email, 
        phone: data.phone, 
        address: data.address 
      }, { status: 201 });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const id = (body.id || "").toString().trim();
      if (!id) return badRequest("id is required");

      const update: Record<string, string | null> = {};
      if (Object.prototype.hasOwnProperty.call(body, 'name')) {
        const name = (body.name || "").toString().trim();
        if (!name) return badRequest("Name is required");
        update.name = name;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'email')) {
        const email = (body.email ?? null) ? String(body.email).trim().toLowerCase() : null;
        if (!email) return badRequest("Email is required");
        
        // Validate email format
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(email)) return badRequest("Invalid email format");
        
        update.email = email;
      }

      // Check for duplicate name + email combination (excluding current customer)
      if (update.name && update.email) {
        const { data: existingCustomer } = await supaAdmin
          .from("customers")
          .select("id")
          .eq("business_id", businessId)
          .eq("name", update.name)
          .eq("email", update.email)
          .neq("id", id)
          .single();
        
        if (existingCustomer) {
          return badRequest("A customer with this name and email already exists");
        }
      }
      if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
        const phone = (body.phone ?? null) ? String(body.phone).trim() : null;
        update.phone = phone;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'address')) {
        const address = (body.address ?? null) ? String(body.address).trim() : null;
        update.address = address;
      }
      if (Object.keys(update).length === 0) return badRequest("No fields to update");

      const { data, error } = await supaAdmin
        .from("customers")
        .update(update)
        .eq("id", id)
        .eq("business_id", businessId)
        .select("id")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return badRequest("Customer not found", 404);

      // Log audit action
      await supaAdmin.rpc('log_audit_action', {
        p_business_id: businessId,
        p_user_id: userId,
        p_action: 'update',
        p_resource_type: 'customer',
        p_resource_id: data.id,
        p_details: update
      });

      return json({ ok: true, id: data.id });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const customerId = url.searchParams.get("id");
      if (!customerId) return badRequest("Customer ID is required");

      console.log(`[customers] Starting cascade deletion for customer: ${customerId}`);

      // Get customer data for audit log before deletion
      const { data: customerData } = await supaAdmin
        .from("customers")
        .select("name, email")
        .eq("id", customerId)
        .eq("business_id", businessId)
        .single();

      if (!customerData) return badRequest("Customer not found", 404);

      // Get counts of related records for audit logging
      const { data: quotes } = await supaAdmin
        .from("quotes")
        .select("id")
        .eq("customer_id", customerId)
        .eq("business_id", businessId);

      const { data: invoices } = await supaAdmin
        .from("invoices")
        .select("id")
        .eq("customer_id", customerId)
        .eq("business_id", businessId);

      const { data: jobs } = await supaAdmin
        .from("jobs")
        .select("id")
        .eq("customer_id", customerId)
        .eq("business_id", businessId);

      const quotesCount = quotes?.length || 0;
      const invoicesCount = invoices?.length || 0;
      const jobsCount = jobs?.length || 0;

      console.log(`[customers] Found ${quotesCount} quotes, ${invoicesCount} invoices, ${jobsCount} jobs to cascade delete`);

      // Begin cascade deletion in correct order
      let deletedCounts = {
        quote_events: 0,
        quote_line_items: 0,
        invoice_line_items: 0,
        payments: 0,
        jobs: jobsCount,
        invoices: invoicesCount,
        quotes: quotesCount
      };

      // 1. Delete quote events for all customer quotes
      if (quotesCount > 0) {
        const quoteIds = quotes!.map(q => q.id);
        const { error: quoteEventsError, count } = await supaAdmin
          .from("quote_events")
          .delete({ count: 'exact' })
          .in("quote_id", quoteIds.map(id => id.toString()));
        if (quoteEventsError) throw quoteEventsError;
        deletedCounts.quote_events = count || 0;
        console.log(`[customers] Deleted ${deletedCounts.quote_events} quote events`);
      }

      // 2. Delete quote line items for all customer quotes
      if (quotesCount > 0) {
        const { error: quoteLineItemsError, count } = await supaAdmin
          .from("quote_line_items")
          .delete({ count: 'exact' })
          .in("quote_id", quotes!.map(q => q.id));
        if (quoteLineItemsError) throw quoteLineItemsError;
        deletedCounts.quote_line_items = count || 0;
        console.log(`[customers] Deleted ${deletedCounts.quote_line_items} quote line items`);
      }

      // 3. Delete invoice line items for all customer invoices
      if (invoicesCount > 0) {
        const { error: invoiceLineItemsError, count } = await supaAdmin
          .from("invoice_line_items")
          .delete({ count: 'exact' })
          .in("invoice_id", invoices!.map(i => i.id));
        if (invoiceLineItemsError) throw invoiceLineItemsError;
        deletedCounts.invoice_line_items = count || 0;
        console.log(`[customers] Deleted ${deletedCounts.invoice_line_items} invoice line items`);
      }

      // 4. Delete payments for all customer invoices
      if (invoicesCount > 0) {
        const { error: paymentsError, count } = await supaAdmin
          .from("payments")
          .delete({ count: 'exact' })
          .in("invoice_id", invoices!.map(i => i.id));
        if (paymentsError) throw paymentsError;
        deletedCounts.payments = count || 0;
        console.log(`[customers] Deleted ${deletedCounts.payments} payments`);
      }

      // 5. Delete jobs for the customer
      if (jobsCount > 0) {
        const { error: jobsError } = await supaAdmin
          .from("jobs")
          .delete()
          .eq("customer_id", customerId)
          .eq("business_id", businessId);
        if (jobsError) throw jobsError;
        console.log(`[customers] Deleted ${jobsCount} jobs`);
      }

      // 6. Delete invoices for the customer
      if (invoicesCount > 0) {
        const { error: invoicesError } = await supaAdmin
          .from("invoices")
          .delete()
          .eq("customer_id", customerId)
          .eq("business_id", businessId);
        if (invoicesError) throw invoicesError;
        console.log(`[customers] Deleted ${invoicesCount} invoices`);
      }

      // 7. Delete quotes for the customer
      if (quotesCount > 0) {
        const { error: quotesError } = await supaAdmin
          .from("quotes")
          .delete()
          .eq("customer_id", customerId)
          .eq("business_id", businessId);
        if (quotesError) throw quotesError;
        console.log(`[customers] Deleted ${quotesCount} quotes`);
      }

      // 8. Finally delete the customer
      const { error } = await supaAdmin
        .from("customers")
        .delete()
        .eq("id", customerId)
        .eq("business_id", businessId);

      if (error) throw error;

      console.log(`[customers] Successfully cascade deleted customer and all related records`);

      // Log comprehensive audit action
      await supaAdmin.rpc('log_audit_action', {
        p_business_id: businessId,
        p_user_id: userId,
        p_action: 'cascade_delete',
        p_resource_type: 'customer',
        p_resource_id: customerId,
        p_details: { 
          customer: { name: customerData.name, email: customerData.email },
          cascade_deleted: deletedCounts
        }
      });

      return json({ ok: true, cascade_deleted: deletedCounts });
    }

    return badRequest("Method not allowed", 405);
  } catch (e) {
    const method = req.method || 'UNKNOWN';
    return json({ error: serializeError(e, `${method} request`) }, { status: 500 });
  }
});
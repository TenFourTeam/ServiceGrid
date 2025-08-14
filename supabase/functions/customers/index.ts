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

    return badRequest("Method not allowed", 405);
  } catch (e) {
    const method = req.method || 'UNKNOWN';
    return json({ error: serializeError(e, `${method} request`) }, { status: 500 });
  }
});
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

interface CustomerImport {
  name: string;
  email: string;  // Now required
  phone?: string;
  address?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId: ownerId, supaAdmin: supabase } = await requireCtx(req);
    const { customers }: { customers: CustomerImport[] } = await req.json();

    if (!Array.isArray(customers) || customers.length === 0) {
      throw new Error("No customers provided for import");
    }

    // Get the business for this owner
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", ownerId)
      .limit(1)
      .maybeSingle();

    if (businessError) throw businessError;
    if (!business) throw new Error("Business not found");

    // Filter out duplicate emails if they exist
    const existingEmails = await Promise.all(
      customers
        .filter(c => c.email)
        .map(async (customer) => {
          const { data } = await supabase
            .from("customers")
            .select("email")
            .eq("email", customer.email)
            .eq("owner_id", ownerId)
            .limit(1)
            .maybeSingle();
          return data?.email;
        })
    );

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    
    const uniqueCustomers = customers.filter((customer, index) => {
      if (!customer.name?.trim()) return false;
      if (!customer.email?.trim()) return false;
      if (!emailRegex.test(customer.email.trim())) return false;
      if (existingEmails.includes(customer.email)) return false;
      return true;
    });

    if (uniqueCustomers.length === 0) {
      return json({ 
        imported: 0, 
        message: "No new customers to import (duplicates or invalid data)" 
      });
    }

    // Prepare customers for bulk insert
    const customersToInsert = uniqueCustomers.map(customer => ({
      name: customer.name.trim(),
      email: customer.email.trim(), // Required field
      phone: customer.phone?.trim() || null,
      address: customer.address?.trim() || null,
      business_id: business.id,
      owner_id: ownerId,
    }));

    // Bulk insert customers
    const { data: insertedCustomers, error: insertError } = await supabase
      .from("customers")
      .insert(customersToInsert)
      .select("id");

    if (insertError) {
      console.error("Bulk insert error:", insertError);
      throw new Error(`Failed to import customers: ${insertError.message}`);
    }

    return json({ 
      imported: insertedCustomers?.length || 0,
      message: `Successfully imported ${insertedCustomers?.length || 0} customers`
    });

  } catch (error) {
    console.error("Bulk import error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: msg }, { status: 500 });
  }
});
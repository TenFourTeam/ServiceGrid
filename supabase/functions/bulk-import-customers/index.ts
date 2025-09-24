import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";
import { parsePhoneNumber } from "https://esm.sh/libphonenumber-js@1.12.12";

interface CustomerImport {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

function normalizeToE164(phone: string, defaultCountry: string = 'US'): string {
  if (!phone?.trim()) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry as any);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.number;
    }
  } catch (e) {
    console.warn('[phoneNormalization] Failed to parse phone:', phone, e);
  }
  
  return '';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 [bulk-import] Request method:", req.method);
    console.log("🔍 [bulk-import] Content-Type:", req.headers.get("content-type"));
    
    const { userId: ownerId, businessId, supaAdmin: supabase } = await requireCtx(req);
    
    // Parse JSON body
    const parsedBody = await req.json();

    const { customers }: { customers: CustomerImport[] } = parsedBody;
    console.log("✅ [bulk-import] Successfully parsed customers:", customers?.length || 0);
    console.log("✅ [bulk-import] Business ID:", businessId);

    if (!Array.isArray(customers) || customers.length === 0) {
      throw new Error("No customers provided for import");
    }

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
    const customersToInsert = uniqueCustomers.map(customer => {
      const customerData: any = {
        name: customer.name.trim(),
        email: customer.email.trim(),
        business_id: businessId,
        owner_id: ownerId,
      };

      // Add phone if provided and valid
      if (customer.phone?.trim()) {
        const normalizedPhone = normalizeToE164(customer.phone.trim());
        if (normalizedPhone) {
          customerData.phone = normalizedPhone;
        }
      }

      // Add address if provided
      if (customer.address?.trim()) {
        customerData.address = customer.address.trim();
      }

      return customerData;
    });

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
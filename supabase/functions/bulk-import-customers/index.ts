import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function resolveOwnerIdFromClerk(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing Authorization header");
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) throw new Error("Missing CLERK_SECRET_KEY");
  
  const payload = await verifyToken(token, { secretKey });
  const clerkSub = (payload as any).sub as string;
  const email = (payload as any)?.email as string | undefined;
  
  const supabase = createAdminClient();

  // Try mapping by clerk_user_id first
  let { data: profByClerk, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkSub)
    .limit(1)
    .maybeSingle();
  
  if (profErr) throw profErr;
  if (profByClerk?.id) return { ownerId: profByClerk.id as string, email };

  if (email) {
    const { data: profByEmail, error: profByEmailErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .limit(1)
      .maybeSingle();
    
    if (profByEmailErr) throw profByEmailErr;
    if (profByEmail?.id) return { ownerId: profByEmail.id as string, email };
  }

  throw new Error("Unable to resolve user profile");
}

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
    const { ownerId } = await resolveOwnerIdFromClerk(req);
    const { customers }: { customers: CustomerImport[] } = await req.json();

    if (!Array.isArray(customers) || customers.length === 0) {
      throw new Error("No customers provided for import");
    }

    const supabase = createAdminClient();

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
      return new Response(JSON.stringify({ 
        imported: 0, 
        message: "No new customers to import (duplicates or invalid data)" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
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

    return new Response(JSON.stringify({ 
      imported: insertedCustomers?.length || 0,
      message: `Successfully imported ${insertedCustomers?.length || 0} customers`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Bulk import error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
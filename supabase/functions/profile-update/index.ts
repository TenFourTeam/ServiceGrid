import { serve } from "https://deno.land/std/http/server.ts";
import { z } from "https://esm.sh/zod@3";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-business-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  businessName: z.string().trim().min(2, 'Enter your business name')
    .refine(v => v.toLowerCase() !== 'my business', 'Please choose a real business name'),
  phoneRaw: z.string().trim().min(7, 'Enter a valid phone number')
});

function normalizeToE164(phone: string): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default to US format for 10 digits
  return digits.length === 10 ? `+1${digits}` : phone;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: { code: "method_not_allowed", message: "Method not allowed" }}, { status: 405 });
    }

    console.log(JSON.stringify({ evt: 'profile.update.start' }));

    const ctx = await requireCtx(req);
    const body = ProfileUpdateSchema.parse(await req.json());

    console.log(JSON.stringify({ 
      evt: 'profile.update.validated', 
      businessId: ctx.businessId, 
      userUuid: ctx.userId,
      hasName: !!body.fullName,
      hasBusinessName: !!body.businessName,
      hasPhone: !!body.phoneRaw
    }));

    const phoneE164 = normalizeToE164(body.phoneRaw);

    // Update user profile (name and phone)
    const { error: profileError } = await ctx.supaAdmin
      .from('profiles')
      .update({ 
        full_name: body.fullName,
        phone_e164: phoneE164
      })
      .eq('id', ctx.userId);

    if (profileError) {
      console.error('Profile update failed:', profileError);
      return json({ error: { code: "profile_update_failed", message: profileError.message }}, { status: 400 });
    }

    // Update business (name and phone)
    const { data: business, error: businessError } = await ctx.supaAdmin
      .from('businesses')
      .update({ 
        name: body.businessName,
        phone: phoneE164,
        updated_at: new Date().toISOString()
      })
      .eq('id', ctx.businessId)
      .select('id,name,phone')
      .single();

    if (businessError) {
      console.error('Business update failed:', businessError);
      return json({ error: { code: "business_update_failed", message: businessError.message }}, { status: 400 });
    }

    // Update Clerk user name
    try {
      // This would require Clerk backend API, for now we'll skip this part
      // and rely on the frontend to update Clerk user name separately
    } catch (e) {
      console.warn('Could not update Clerk user name:', e);
    }

    console.log(JSON.stringify({ 
      evt: 'profile.update.success', 
      businessId: ctx.businessId,
      businessName: business.name
    }));

    // Return normalized truth (what the UI should rehydrate)
    return new Response(JSON.stringify({ 
      data: {
        fullName: body.fullName,
        businessName: business.name,
        phoneE164: business.phone,
      }
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...cors }
    });

  } catch (e: any) {
    console.error('Profile update error:', e);
    
    // Handle Zod validation errors
    if (e?.issues?.[0]) {
      const msg = e.issues[0].message;
      return json({ error: { code: "validation_error", message: msg }}, { status: 400 });
    }
    
    const msg = e?.message || "Invalid input";
    const status = e?.status ?? 500;
    return new Response(JSON.stringify({ error: { code: "server_error", message: msg }}), { 
      status, 
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
});
import { serve } from "https://deno.land/std/http/server.ts";
import { z } from "https://esm.sh/zod@3";
import { requireCtx } from "../_lib/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      console.error(`Method ${req.method} not allowed`);
      return json({ error: { code: "method_not_allowed", message: "Method not allowed" }}, 405);
    }

    console.log(JSON.stringify({ evt: 'profile.update.start', method: req.method }));

    const ctx = await requireCtx(req);
    console.log(JSON.stringify({ evt: 'profile.update.auth_success', userUuid: ctx.userUuid, businessId: ctx.businessId }));
    
    const rawBody = await req.text();
    console.log(JSON.stringify({ evt: 'profile.update.raw_body', body: rawBody }));
    
    const parsedBody = JSON.parse(rawBody);
    console.log(JSON.stringify({ evt: 'profile.update.parsed_body', parsedBody }));
    
    const input = ProfileUpdateSchema.parse(parsedBody);

    console.log(JSON.stringify({ 
      evt: 'profile.update.validated', 
      businessId: ctx.businessId, 
      userUuid: ctx.userUuid,
      input: input
    }));

    const phoneE164 = normalizeToE164(input.phoneRaw);

    // Update user profile (name and phone)
    const { error: profileError } = await ctx.supaAdmin
      .from('profiles')
      .update({ 
        full_name: input.fullName,
        phone_e164: phoneE164
      })
      .eq('id', ctx.userUuid);

    if (profileError) {
      console.error('Profile update failed:', profileError);
      return json({ error: { code: "profile_update_failed", message: profileError.message }}, 400);
    }

    // Update business (name and phone)
    const { data: business, error: businessError } = await ctx.supaAdmin
      .from('businesses')
      .update({ 
        name: input.businessName,
        phone: phoneE164,
        updated_at: new Date().toISOString()
      })
      .eq('id', ctx.businessId)
      .select('id,name,phone')
      .single();

    if (businessError) {
      console.error('Business update failed:', businessError);
      return json({ error: { code: "business_update_failed", message: businessError.message }}, 400);
    }

    console.log(JSON.stringify({ 
      evt: 'profile.update.success', 
      businessId: ctx.businessId,
      businessName: business.name
    }));

    return json({ 
      data: {
        fullName: input.fullName,
        businessName: business.name,
        phoneE164: business.phone,
      }
    });

  } catch (e: any) {
    console.error('Profile update error:', e);
    
    // Handle Zod validation errors
    if (e?.issues?.[0]) {
      const msg = e.issues[0].message;
      return json({ error: { code: "validation_error", message: msg }}, 400);
    }
    
    const msg = e?.message || "Invalid input";
    const status = e?.status ?? 500;
    return json({ error: { code: "server_error", message: msg }}, status);
  }
});
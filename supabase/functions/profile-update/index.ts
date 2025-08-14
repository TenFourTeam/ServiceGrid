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
    console.log(JSON.stringify({ 
      evt: 'profile.update.request', 
      method: req.method,
      url: req.url,
      hasAuth: !!req.headers.get('authorization')
    }));

    if (req.method !== 'POST') {
      console.error(`Method ${req.method} not allowed for profile-update`);
      return json({ error: { code: "method_not_allowed", message: "Only POST method is allowed" }}, 405);
    }

    console.log(JSON.stringify({ evt: 'profile.update.start', method: req.method }));

    // Verify authentication and get context
    let ctx;
    try {
      ctx = await requireCtx(req);
      console.log(JSON.stringify({ 
        evt: 'profile.update.auth_success', 
        userUuid: ctx.userId, 
        businessId: ctx.businessId,
        clerkUserId: ctx.clerkUserId 
      }));
    } catch (authError) {
      console.error(JSON.stringify({ 
        evt: 'profile.update.auth_failed', 
        error: authError,
        authHeader: req.headers.get('authorization')?.substring(0, 20) + '...'
      }));
      throw authError;
    }
    
    const rawBody = await req.text();
    console.log(JSON.stringify({ evt: 'profile.update.raw_body', bodyLength: rawBody.length }));
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
      console.log(JSON.stringify({ evt: 'profile.update.parsed_body', parsedBody }));
    } catch (parseError) {
      console.error(JSON.stringify({ evt: 'profile.update.parse_error', error: parseError, rawBody }));
      return json({ error: { code: "invalid_json", message: "Invalid JSON in request body" }}, 400);
    }
    
    let input;
    try {
      input = ProfileUpdateSchema.parse(parsedBody);
    } catch (validationError) {
      console.error(JSON.stringify({ evt: 'profile.update.validation_error', error: validationError }));
      return json({ error: { code: "validation_failed", message: "Invalid input data", details: validationError }}, 400);
    }

    console.log(JSON.stringify({ 
      evt: 'profile.update.validated', 
      businessId: ctx.businessId, 
      userUuid: ctx.userId,
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
      .eq('id', ctx.userId);

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
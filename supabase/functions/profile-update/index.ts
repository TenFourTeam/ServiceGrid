import { serve } from "https://deno.land/std/http/server.ts";
import { z } from "https://esm.sh/zod@3";
import { requireCtx } from "../_lib/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

const ProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  businessName: z.string().trim().max(120).optional(), // Business name for reference only
  phoneRaw: z.string().trim().min(7, 'Enter a valid phone number').optional().or(z.literal(''))
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
      return json({ error: { code: "method_not_allowed", message: "Only POST method is allowed" }}, 405);
    }

    console.log('📝 [profile-update] Starting profile update');

    // Verify authentication and get context
    const ctx = await requireCtx(req);
    console.log(`✅ [profile-update] Auth context resolved - User: ${ctx.userId}, Business: ${ctx.businessId}`);
    
    // Parse and validate request body
    const rawBody = await req.text();
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ [profile-update] Invalid JSON:', parseError);
      return json({ error: { code: "invalid_json", message: "Invalid JSON in request body" }}, 400);
    }
    
    let input;
    try {
      input = ProfileUpdateSchema.parse(parsedBody);
    } catch (validationError) {
      console.error('❌ [profile-update] Validation failed:', validationError);
      const firstError = validationError.issues?.[0];
      const message = firstError ? firstError.message : 'Invalid input data';
      return json({ error: { code: "validation_failed", message, details: validationError }}, 400);
    }

    console.log(`🔄 [profile-update] evt=profile.update userUuid=${ctx.userId} businessId=${ctx.businessId}`);

    const phoneE164 = normalizeToE164(input.phoneRaw || '');

    // Update profiles table - single source of truth for personal data
    const { data: profileData, error: profileError } = await ctx.supaAdmin
      .from('profiles')
      .update({
        full_name: input.fullName,
        phone_e164: phoneE164,
      })
      .eq('id', ctx.userId)
      .select('id, full_name, phone_e164, updated_at')
      .single();

    if (profileError) {
      console.error('❌ [profile-update] Profile update failed:', profileError);
      return json({ error: { code: "profile_update_failed", message: profileError.message }}, 500);
    }

    console.log(`🎉 [profile-update] Update successful - User: ${profileData.full_name}`);

    return json({
      data: {
        fullName: profileData.full_name,
        phoneE164: profileData.phone_e164,
        updatedAt: profileData.updated_at,
      }
    });

  } catch (error: any) {
    console.error('💥 [profile-update] Unexpected error:', error);
    
    // Handle Response objects from requireCtx
    if (error instanceof Response) {
      return error;
    }
    
    // Handle different types of auth errors with proper status codes
    if (error?.message?.includes('not found') || error?.message?.includes('not owned by current user')) {
      return json({ error: { code: 'forbidden', message: 'Access denied' }}, 403);
    }
    
    if (error?.message?.includes('Invalid') || error?.message?.includes('Unauthorized')) {
      return json({ error: { code: 'auth_error', message: 'Invalid authentication' }}, 401);
    }

    return json({ 
      error: { 
        code: "server_error", 
        message: error?.message || "Profile update failed",
        action: "retry"
      }
    }, 500);
  }
});
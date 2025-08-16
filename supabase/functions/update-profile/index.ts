import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";
import { parsePhoneNumber } from "https://esm.sh/libphonenumber-js@1.12.12";

interface UpdateProfileRequest {
  fullName: string;
  phoneRaw?: string;
  businessName?: string; // For reference only, not stored in profiles
}

interface UpdateProfileResponse {
  data: {
    fullName: string;
    phoneE164: string | null;
    updatedAt: string;
  };
}

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: { message: "Method not allowed" } }, { status: 405 });
  }

  try {
    // Authenticate with Clerk and get user context
    const { userId, supaAdmin } = await requireCtx(req);
    
    // Parse request body
    const body: UpdateProfileRequest = await req.json();
    console.info('[update-profile] Processing update for user:', userId, {
      hasName: !!body.fullName,
      hasBusiness: !!body.businessName,
      hasPhone: !!body.phoneRaw
    });

    // Validate required fields
    if (!body.fullName?.trim()) {
      return json({ 
        error: { 
          message: "Full name is required",
          code: "validation_error" 
        } 
      }, { status: 400 });
    }

    // Normalize phone to E.164 format if provided
    let phoneE164: string | null = null;
    if (body.phoneRaw?.trim()) {
      try {
        const parsed = parsePhoneNumber(body.phoneRaw, 'US');
        phoneE164 = parsed?.format('E.164') || null;
        console.info('[update-profile] Phone normalized:', body.phoneRaw, '->', phoneE164);
      } catch (error) {
        console.warn('[update-profile] Phone parsing failed:', error);
        phoneE164 = body.phoneRaw; // Fallback to raw input
      }
    }

    // Update profile using service role permissions (bypasses RLS)
    const { data, error } = await supaAdmin
      .from('profiles')
      .update({
        full_name: body.fullName.trim(),
        phone_e164: phoneE164,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('full_name, phone_e164, updated_at')
      .single();

    if (error) {
      console.error('[update-profile] Database error:', error);
      return json({ 
        error: { 
          message: "Failed to update profile",
          code: "database_error",
          details: error.message
        } 
      }, { status: 500 });
    }

    console.info('[update-profile] Profile updated successfully:', data);

    // Return successful response
    const response: UpdateProfileResponse = {
      data: {
        fullName: data.full_name,
        phoneE164: data.phone_e164,
        updatedAt: data.updated_at
      }
    };

    return json(response, { status: 200 });

  } catch (error: any) {
    console.error('[update-profile] Unexpected error:', error);
    
    // If error is already a Response (from requireCtx), return it
    if (error instanceof Response) {
      return error;
    }

    return json({ 
      error: { 
        message: "Internal server error",
        code: "server_error"
      } 
    }, { status: 500 });
  }
}
// Shared authentication and business context resolution for Supabase Edge Functions
import { verifyToken } from "https://esm.sh/@clerk/backend@1.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

type ClerkUserId = string; // e.g., 'user_abc123'
type UserUuid = string;    // postgres uuid

export type AuthContext = {
  clerkUserId: ClerkUserId;
  userId: UserUuid; // Keep for backwards compatibility
  email?: string;
  businessId: string;
  supaAdmin: ReturnType<typeof createClient>;
};

export async function requireCtx(req: Request, options: { autoCreate?: boolean } = { autoCreate: true }): Promise<AuthContext> {
  console.info('🔍 [auth] === JWT DEBUGGING START ===');
  console.info('🔍 [auth] Request URL:', req.url);
  console.info('🔍 [auth] Request method:', req.method);
  
  // Extract and verify Clerk token
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  console.info('🔍 [auth] Auth header present:', !!authHeader);
  console.info('🔍 [auth] Auth header starts with Bearer:', authHeader?.startsWith("Bearer "));
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error('❌ [auth] Missing or invalid authorization header, full headers:', Object.fromEntries(req.headers.entries()));
    throw new Error("Missing authentication token");
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  console.info('🔍 [auth] Token extracted, length:', token.length);
  console.info('🔍 [auth] Token prefix (first 20 chars):', token.substring(0, 20));
  console.info('🔍 [auth] Token suffix (last 20 chars):', token.substring(token.length - 20));
  
  // Try to decode JWT header to inspect structure (without verification)
  try {
    const [header, payload] = token.split('.');
    if (header && payload) {
      const decodedHeader = JSON.parse(atob(header));
      const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      console.info('🔍 [auth] JWT Header:', decodedHeader);
      console.info('🔍 [auth] JWT Payload preview:', {
        sub: decodedPayload.sub,
        iss: decodedPayload.iss,
        exp: decodedPayload.exp,
        iat: decodedPayload.iat,
        nbf: decodedPayload.nbf
      });
      console.info('🔍 [auth] Token expiry (UTC):', new Date(decodedPayload.exp * 1000).toISOString());
      console.info('🔍 [auth] Token issued at (UTC):', new Date(decodedPayload.iat * 1000).toISOString());
      console.info('🔍 [auth] Current time (UTC):', new Date().toISOString());
    }
  } catch (decodeError) {
    console.warn('⚠️ [auth] Could not decode token structure:', decodeError);
  }
  
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  console.info('🔍 [auth] CLERK_SECRET_KEY present:', !!secretKey);
  console.info('🔍 [auth] CLERK_SECRET_KEY length:', secretKey?.length || 0);
  console.info('🔍 [auth] CLERK_SECRET_KEY prefix:', secretKey?.substring(0, 10) || 'N/A');
  
  if (!secretKey) {
    console.error('❌ [auth] Missing CLERK_SECRET_KEY');
    throw new Error("Server configuration error - missing CLERK_SECRET_KEY");
  }

  let payload: any;
  try {
    console.info('🔍 [auth] Starting Clerk token verification...');
    const startTime = Date.now();
    payload = await verifyToken(token, { secretKey });
    const endTime = Date.now();
    console.info('✅ [auth] Token verification successful in', endTime - startTime, 'ms');
    console.info('🔍 [auth] Verified payload:', {
      sub: payload.sub,
      email: payload.email,
      primary_email: payload.primary_email,
      session_id: payload.sid,
      azp: payload.azp
    });
  } catch (e) {
    console.error('❌ [auth] Token verification failed');
    console.error('❌ [auth] Error type:', e.constructor.name);
    console.error('❌ [auth] Error message:', e.message);
    console.error('❌ [auth] Error stack:', e.stack);
    console.error('❌ [auth] Full error object:', JSON.stringify(e, null, 2));
    throw new Error(`Authentication failed: ${e.message || e}`);
  }

  const clerkUserId = payload.sub as ClerkUserId;
  const email = (payload.email || payload["primary_email"] || "") as string;

  // Create admin Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase configuration missing");
  }
  
  const supaAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  // Resolve business context
  const url = new URL(req.url);
  const candidateBusinessId = req.headers.get("X-Business-Id") || url.searchParams.get("businessId") || null;

  // 1) Resolve internal UUID via profiles (Clerk -> UUID)
  const userUuid = await resolveUserUuid(supaAdmin, clerkUserId, email, options.autoCreate);

  // 3) Resolve business using UUID (do NOT call the Clerk->UUID mapper again)
  const businessId = await resolveBusinessId(supaAdmin, userUuid, candidateBusinessId, options.autoCreate);

  return {
    clerkUserId,
    userId: userUuid, // Return the resolved UUID, not the Clerk user ID
    email: email?.toLowerCase() || undefined,
    businessId,
    supaAdmin
  };
}

async function resolveBusinessId(
  supabase: ReturnType<typeof createClient>, 
  userUuid: UserUuid, 
  candidate?: string | null,
  autoCreate: boolean = true
): Promise<string> {
  // Single business per user model - get user's only business via owner membership
  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userUuid)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (membership?.business_id) {
    return membership.business_id;
  }

  if (!autoCreate) {
    throw new Error('No business found and auto-creation disabled');
  }

  // No business exists - create one directly with service role permissions
  console.info(`🔄 [auth] Creating default business for user: ${userUuid}`);
  
  // 1. Create the business
  const { data: newBusiness, error: businessError } = await supabase
    .from("businesses")
    .insert({
      name: 'My Business',
      owner_id: userUuid
    })
    .select("id")
    .single();

  if (businessError) {
    console.error('❌ [auth] Failed to create business:', businessError);
    throw new Error(`Failed to create default business: ${businessError.message}`);
  }

  // 2. Create business membership
  const { error: membershipError } = await supabase
    .from("business_members")
    .insert({
      business_id: newBusiness.id,
      user_id: userUuid,
      role: 'owner',
      joined_at: new Date().toISOString()
    })
    .select()
    .single();

  if (membershipError) {
    console.error('❌ [auth] Failed to create business membership:', membershipError);
    // Don't throw here - business was created successfully
  }

  // 3. Update profile default_business_id
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ default_business_id: newBusiness.id })
    .eq("id", userUuid);

  if (profileError) {
    console.error('❌ [auth] Failed to update profile default_business_id:', profileError);
    // Don't throw here - business was created successfully
  }

  console.info(`✅ [auth] Default business created successfully: ${newBusiness.id}`);
  return newBusiness.id;
}

async function resolveUserUuid(supabase: ReturnType<typeof createClient>, clerkUserId: ClerkUserId, email: string, autoCreate: boolean = true): Promise<UserUuid> {
  // Look up by clerk_user_id first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .limit(1)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.id) return profile.id as UserUuid;

  if (!autoCreate) {
    throw new Error('Profile not found and auto-creation disabled');
  }

  // Profile doesn't exist - create it automatically for new users
  console.info(`🔄 [auth] Creating profile for new Clerk user: ${clerkUserId}`);
  
  const { data: newProfile, error: createError } = await supabase
    .from("profiles")
    .insert({
      clerk_user_id: clerkUserId,
      email: email.toLowerCase() || ""
    })
    .select("id")
    .single();

  if (createError) {
    // Handle race condition - another request may have created the profile
    if (createError.code === '23505') {
      console.info('🔄 [auth] Profile already exists, re-querying...');
      const { data: existingProfile, error: existingError } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", clerkUserId)
        .limit(1)
        .maybeSingle();
      
      if (existingError) throw existingError;
      if (existingProfile?.id) return existingProfile.id as UserUuid;
    }
    
    console.error('❌ [auth] Failed to create profile:', createError);
    throw new Error(`Failed to create user profile: ${createError.message}`);
  }


  console.info(`✅ [auth] Profile created successfully for user: ${clerkUserId}`);
  return newProfile.id as UserUuid;
}

// CORS headers for Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-business-id",
  "Access-Control-Allow-Methods": "*",
};

// JSON response helper with CORS
export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    ...init,
  });
}
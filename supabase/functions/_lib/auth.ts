// Shared authentication and business context resolution for Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

// Conditionally import verifyToken based on test mode
const TEST_MODE = Deno.env.get("TEST_MODE") === "true";
let verifyToken: any;

if (TEST_MODE) {
  console.info('🧪 [auth] Running in TEST_MODE - using mock authentication');
  const testAuth = await import("./auth-test.ts");
  verifyToken = testAuth.verifyToken;
} else {
  const clerkBackend = await import("https://esm.sh/@clerk/backend@1.7.0");
  verifyToken = clerkBackend.verifyToken;
}

type ClerkUserId = string; // e.g., 'user_abc123'
type UserUuid = string;    // postgres uuid

export type AuthContext = {
  clerkUserId: ClerkUserId;
  userId: UserUuid; // Keep for backwards compatibility
  email?: string;
  businessId: string;
  supaAdmin: any;
};

export type AuthContextWithUserClient = {
  clerkUserId: ClerkUserId;
  userId: UserUuid;
  email?: string;
  businessId: string;
  supaAdmin: any;
  userClient: any;
};

export async function getCurrentUserId(req: Request): Promise<string> {
  const { userId } = await requireCtx(req);
  return userId;
}

export async function requireCtx(req: Request, options: { autoCreate?: boolean, businessId?: string } = { autoCreate: true }): Promise<AuthContext> {
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
    const error = e as Error;
    console.error('❌ [auth] Token verification failed');
    console.error('❌ [auth] Error type:', error.constructor.name);
    console.error('❌ [auth] Error message:', error.message);
    console.error('❌ [auth] Error stack:', error.stack);
    console.error('❌ [auth] Full error object:', JSON.stringify(error, null, 2));
    throw new Error(`Authentication failed: ${error.message || error}`);
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
    auth: { persistSession: false },
    db: { schema: 'public' },
    global: {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    }
  });

  const userUuid = await resolveUserUuid(supaAdmin, clerkUserId, email, options.autoCreate);

  // Get business ID - try parameter first, then user's primary business
  let businessId: string;
  if (options?.businessId) {
    businessId = options.businessId;
  } else {
    // Get user's primary business (owner business only)
    const { data: business } = await supaAdmin
      .from('businesses')
      .select('id')
      .eq('owner_id', userUuid)
      .single();
    
    if (business) {
      businessId = business.id;
    } else if (options?.autoCreate) {
      // Create new business if none exists
      const { data: newBusiness, error: businessError } = await supaAdmin
        .from('businesses')
        .insert({ name: 'My Business', owner_id: userUuid })
        .select('id')
        .single();
      
      if (businessError) throw businessError;
      businessId = newBusiness.id;
    } else {
      throw new Error('No business found');
    }
  }

  return {
    clerkUserId,
    userId: userUuid,
    email: email?.toLowerCase() || undefined,
    businessId,
    supaAdmin
  };
}

export async function requireCtxWithUserClient(req: Request, options: { autoCreate?: boolean, businessId?: string } = { autoCreate: true }): Promise<AuthContextWithUserClient> {
  // Get the standard auth context using service role
  const authCtx = await requireCtx(req, options);
  
  // Extract the original Clerk JWT token
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader!.replace(/^Bearer\s+/i, "");
  
  // Create user-scoped Supabase client using the Clerk JWT
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase configuration missing");
  }
  
  // Create client that will establish proper auth session with Clerk JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { 
      persistSession: false,
      autoRefreshToken: false,
      storage: undefined // Don't persist in edge functions
    },
    db: { schema: 'public' },
    global: {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey
      }
    }
  });

  console.info('✅ [auth] Created user-scoped client with Clerk JWT for RLS');
  
  return {
    ...authCtx,
    userClient
  };
}

async function resolveUserUuid(supabase: any, clerkUserId: ClerkUserId, email: string, autoCreate: boolean = true): Promise<UserUuid> {
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

  // Profile doesn't exist - try to find by email first to avoid duplicates
  console.info(`🔄 [auth] Creating profile for new Clerk user: ${clerkUserId}`);
  
  // Check if profile exists by email (in case of migration scenarios)
  const { data: emailProfile } = await supabase
    .from("profiles")
    .select("id, clerk_user_id")
    .eq("email", email.toLowerCase())
    .limit(1)
    .maybeSingle();

  if (emailProfile?.id) {
    // Profile exists but lacks clerk_user_id - update it
    if (!emailProfile.clerk_user_id) {
      console.info(`🔄 [auth] Updating existing profile with Clerk ID: ${clerkUserId}`);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ clerk_user_id: clerkUserId })
        .eq("id", emailProfile.id);
      
      if (updateError) {
        console.error('❌ [auth] Failed to update profile with Clerk ID:', updateError);
      }
    }
    return emailProfile.id as UserUuid;
  }
  
  // Create new profile
  const { data: newProfile, error: createError } = await supabase
    .from("profiles")
    .insert({
      clerk_user_id: clerkUserId,
      email: email.toLowerCase() || ""
    })
    .select("id")
    .single();

  if (createError) {
    // Handle race condition - check again by clerk_user_id
    if (createError.code === '23505') {
      console.info('🔄 [auth] Profile constraint violation, re-querying by Clerk ID...');
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", clerkUserId)
        .limit(1)
        .maybeSingle();
      
      if (existingProfile?.id) return existingProfile.id as UserUuid;
      
      // Also try by email
      const { data: emailExistingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .limit(1)
        .maybeSingle();
        
      if (emailExistingProfile?.id) return emailExistingProfile.id as UserUuid;
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
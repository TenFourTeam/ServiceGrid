// Shared authentication and business context resolution for Supabase Edge Functions
// Supports BOTH Clerk JWT and session token authentication during migration
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
  clerkUserId?: ClerkUserId; // Optional during migration
  userId: UserUuid;
  email?: string;
  businessId: string;
  supaAdmin: any;
  authMethod: 'clerk' | 'session'; // Track which auth method was used
};

export type AuthContextWithUserClient = {
  clerkUserId?: ClerkUserId;
  userId: UserUuid;
  email?: string;
  businessId: string;
  supaAdmin: any;
  userClient: any;
  authMethod: 'clerk' | 'session';
};

export async function getCurrentUserId(req: Request): Promise<string> {
  const { userId } = await requireCtx(req);
  return userId;
}

export async function requireCtx(req: Request, options: { autoCreate?: boolean, businessId?: string } = { autoCreate: true }): Promise<AuthContext> {
  console.info('🔍 [auth] === AUTH DEBUGGING START ===');
  console.info('🔍 [auth] Request URL:', req.url);
  console.info('🔍 [auth] Request method:', req.method);
  
  // Check for session token first (new auth method)
  const sessionToken = req.headers.get("x-session-token");
  
  if (sessionToken) {
    console.info('🔍 [auth] Session token detected, using session auth');
    return await requireCtxFromSession(req, sessionToken, options);
  }
  
  // Fall back to Clerk JWT auth
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  console.info('🔍 [auth] Auth header present:', !!authHeader);
  console.info('🔍 [auth] Auth header starts with Bearer:', authHeader?.startsWith("Bearer "));
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error('❌ [auth] Missing or invalid authorization header');
    throw new Error("Missing authentication token");
  }

  return await requireCtxFromClerk(req, authHeader, options);
}

// === SESSION TOKEN AUTHENTICATION ===
async function requireCtxFromSession(
  req: Request, 
  sessionToken: string, 
  options: { autoCreate?: boolean, businessId?: string }
): Promise<AuthContext> {
  const supaAdmin = createSupabaseAdmin();
  
  // Validate session token
  const { data: session, error: sessionError } = await supaAdmin
    .from('business_sessions')
    .select('id, profile_id, expires_at')
    .eq('session_token', sessionToken)
    .single();

  if (sessionError || !session) {
    console.error('❌ [auth] Invalid session token');
    throw new Error("Invalid or expired session");
  }

  // Check expiry
  if (new Date(session.expires_at) < new Date()) {
    console.error('❌ [auth] Session token expired');
    throw new Error("Session expired. Please refresh or login again.");
  }

  // Get profile
  const { data: profile, error: profileError } = await supaAdmin
    .from('profiles')
    .select('id, email, default_business_id')
    .eq('id', session.profile_id)
    .single();

  if (profileError || !profile) {
    console.error('❌ [auth] Profile not found for session');
    throw new Error("Profile not found");
  }

  // Update session last_used_at
  await supaAdmin
    .from('business_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', session.id);

  // Resolve business ID
  const businessId = await resolveBusinessId(
    supaAdmin, 
    profile.id, 
    profile.default_business_id,
    req,
    options
  );

  console.info('✅ [auth] Session auth successful for profile:', profile.id);

  return {
    userId: profile.id,
    email: profile.email?.toLowerCase() || undefined,
    businessId,
    supaAdmin,
    authMethod: 'session',
  };
}

// === CLERK JWT AUTHENTICATION ===
async function requireCtxFromClerk(
  req: Request,
  authHeader: string,
  options: { autoCreate?: boolean, businessId?: string }
): Promise<AuthContext> {
  const token = authHeader.replace(/^Bearer\s+/i, "");
  console.info('🔍 [auth] Token extracted, length:', token.length);
  
  // Try to decode JWT header to inspect structure (without verification)
  try {
    const [header, payload] = token.split('.');
    if (header && payload) {
      const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      console.info('🔍 [auth] JWT Payload preview:', {
        sub: decodedPayload.sub,
        iss: decodedPayload.iss,
        exp: decodedPayload.exp,
      });
    }
  } catch (decodeError) {
    console.warn('⚠️ [auth] Could not decode token structure');
  }
  
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
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
  } catch (e) {
    const error = e as Error;
    console.error('❌ [auth] Token verification failed:', error.message);
    throw new Error(`Authentication failed: ${error.message || error}`);
  }

  const clerkUserId = payload.sub as ClerkUserId;
  const email = (payload.email || payload["primary_email"] || "") as string;

  const supaAdmin = createSupabaseAdmin();
  const userUuid = await resolveUserUuid(supaAdmin, clerkUserId, email, options.autoCreate);

  // Get default business ID from profile
  const { data: profileData } = await supaAdmin
    .from('profiles')
    .select('default_business_id')
    .eq('id', userUuid)
    .maybeSingle();

  const businessId = await resolveBusinessId(
    supaAdmin,
    userUuid,
    profileData?.default_business_id,
    req,
    options
  );

  return {
    clerkUserId,
    userId: userUuid,
    email: email?.toLowerCase() || undefined,
    businessId,
    supaAdmin,
    authMethod: 'clerk',
  };
}

// === SHARED HELPERS ===

function createSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase configuration missing");
  }
  
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    db: { schema: 'public' },
    global: {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    }
  });
}

async function resolveBusinessId(
  supaAdmin: any,
  userUuid: string,
  defaultBusinessId: string | null,
  req: Request,
  options: { autoCreate?: boolean, businessId?: string }
): Promise<string> {
  const url = new URL(req.url);
  const explicitBizId = 
    options?.businessId ||
    req.headers.get('x-business-id') ||
    url.searchParams.get('businessId') ||
    undefined;

  let businessId: string | undefined;

  // 1) Explicit selection via parameter/header/query
  if (explicitBizId) {
    businessId = explicitBizId;
    console.info(`[auth] Using explicit business ID: ${businessId}`);
  } 
  // 2) User default business
  else if (defaultBusinessId) {
    businessId = defaultBusinessId;
    console.info(`[auth] Using default business ID: ${businessId}`);
  }

  // 3) Ownership lookup
  if (!businessId) {
    const { data: owned } = await supaAdmin
      .from('businesses')
      .select('id')
      .eq('owner_id', userUuid)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (owned?.id) {
      businessId = owned.id;
      console.info(`[auth] Using owned business ID: ${businessId}`);
    }
  }

  // 4) Membership lookup
  if (!businessId) {
    const { data: membership } = await supaAdmin
      .from('business_permissions')
      .select('business_id')
      .eq('user_id', userUuid)
      .order('granted_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (membership?.business_id) {
      businessId = membership.business_id;
      console.info(`[auth] Using membership business ID: ${businessId}`);
    }
  }

  // 5) Auto-create (optional)
  if (!businessId) {
    if (!options?.autoCreate) {
      throw new Error('No business found and auto-creation disabled');
    }
    
    const { data: newBusiness, error: businessError } = await supaAdmin
      .from('businesses')
      .insert({ name: 'My Business', owner_id: userUuid })
      .select('id')
      .single();
    
    if (businessError) throw businessError;
    businessId = newBusiness.id;
    console.info(`[auth] Created new business ID: ${businessId}`);
    
    // Update profile to link the new business as default
    await supaAdmin
      .from('profiles')
      .update({ default_business_id: newBusiness.id })
      .eq('id', userUuid);
  }

  if (!businessId) {
    throw new Error('Failed to resolve business ID');
  }

  return businessId;
}

/**
 * Check if the business has AI access and sufficient credits
 */
export async function requireAIAccess(ctx: AuthContext, supabase: any): Promise<void> {
  const { data: business, error } = await supabase
    .from('businesses')
    .select('ai_vision_enabled, ai_monthly_credit_limit, ai_credits_used_this_month')
    .eq('id', ctx.businessId)
    .single();

  if (error) {
    console.error('[requireAIAccess] Error fetching business:', error);
    throw new Error('Failed to verify AI access');
  }

  if (!business.ai_vision_enabled) {
    throw new Error('AI_DISABLED');
  }

  if (business.ai_monthly_credit_limit !== null && 
      business.ai_credits_used_this_month >= business.ai_monthly_credit_limit) {
    throw new Error('CREDIT_LIMIT_EXCEEDED');
  }
}

/**
 * Increment AI credits used for the business
 */
export async function incrementAICredits(ctx: AuthContext, supabase: any, credits: number = 1): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .update({ 
      ai_credits_used_this_month: supabase.raw(`ai_credits_used_this_month + ${credits}`)
    })
    .eq('id', ctx.businessId);

  if (error) {
    console.error('[incrementAICredits] Error incrementing credits:', error);
  }
}

export async function requireCtxWithUserClient(req: Request, options: { autoCreate?: boolean, businessId?: string } = { autoCreate: true }): Promise<AuthContextWithUserClient> {
  const authCtx = await requireCtx(req, options);
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase configuration missing");
  }

  // For session auth, we use service role client (RLS bypassed)
  // For Clerk auth, we use the JWT token
  let userClient;
  
  if (authCtx.authMethod === 'session') {
    // Session auth - use service role for now (TODO: implement proper RLS with session)
    userClient = authCtx.supaAdmin;
    console.info('✅ [auth] Using admin client for session-based RLS');
  } else {
    // Clerk auth - use JWT token
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader!.replace(/^Bearer\s+/i, "");
    
    userClient = createClient(supabaseUrl, anonKey, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false,
        storage: undefined
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
  }
  
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
      await supabase
        .from("profiles")
        .update({ clerk_user_id: clerkUserId })
        .eq("id", emailProfile.id);
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
      console.info('🔄 [auth] Profile constraint violation, re-querying...');
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", clerkUserId)
        .limit(1)
        .maybeSingle();
      
      if (existingProfile?.id) return existingProfile.id as UserUuid;
      
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-business-id, x-session-token",
  "Access-Control-Allow-Methods": "*",
};

// JSON response helper with CORS
export function json(data: unknown, init: ResponseInit = {}) {
  const baseHeaders = { "Content-Type": "application/json", ...corsHeaders };
  
  const extraHeaders = init.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : (init.headers as Record<string, string> | undefined) ?? {};

  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...baseHeaders, ...extraHeaders },
  });
}

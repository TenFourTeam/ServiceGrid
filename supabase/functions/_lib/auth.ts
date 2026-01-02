// Shared authentication and business context resolution for Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

// Test mode support
const TEST_MODE = Deno.env.get("TEST_MODE") === "true";

type UserUuid = string; // postgres uuid

export type AuthContext = {
  userId: UserUuid;
  email?: string;
  businessId: string;
  supaAdmin: any;
};

export type AuthContextWithUserClient = {
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
  console.info('🔍 [auth] === SUPABASE AUTH START ===');
  console.info('🔍 [auth] Request URL:', req.url);
  console.info('🔍 [auth] Request method:', req.method);
  
  // Extract authorization header
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  console.info('🔍 [auth] Auth header present:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error('❌ [auth] Missing or invalid authorization header');
    throw new Error("Missing authentication token");
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  console.info('🔍 [auth] Token extracted, length:', token.length);

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

  // Verify the Supabase JWT and get user
  let user: any;
  try {
    console.info('🔍 [auth] Verifying Supabase JWT...');
    const startTime = Date.now();
    
    const { data, error } = await supaAdmin.auth.getUser(token);
    
    if (error || !data.user) {
      console.error('❌ [auth] Token verification failed:', error?.message);
      throw new Error(`Authentication failed: ${error?.message || 'Invalid token'}`);
    }
    
    user = data.user;
    const endTime = Date.now();
    console.info('✅ [auth] Token verification successful in', endTime - startTime, 'ms');
    console.info('🔍 [auth] User ID:', user.id);
    console.info('🔍 [auth] User email:', user.email);
  } catch (e) {
    const error = e as Error;
    console.error('❌ [auth] Token verification failed:', error.message);
    throw new Error(`Authentication failed: ${error.message || error}`);
  }

  const userUuid = user.id as UserUuid;
  const email = user.email || "";

  // Ensure profile exists
  await ensureProfile(supaAdmin, userUuid, email, options.autoCreate);

  // Business resolution with full chain
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
  } else {
    // 2) User default business
    const { data: profileDefault } = await supaAdmin
      .from('profiles')
      .select('default_business_id')
      .eq('id', userUuid)
      .maybeSingle();

    if (profileDefault?.default_business_id) {
      businessId = profileDefault.default_business_id;
      console.info(`[auth] Using default business ID: ${businessId}`);
    }
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

  return {
    userId: userUuid,
    email: email?.toLowerCase() || undefined,
    businessId,
    supaAdmin
  };
}

/**
 * Check if the business has AI access and sufficient credits
 * Throws an error if AI is disabled or credit limit exceeded
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
    // Don't throw - this shouldn't block the operation
  }
}

export async function requireCtxWithUserClient(req: Request, options: { autoCreate?: boolean, businessId?: string } = { autoCreate: true }): Promise<AuthContextWithUserClient> {
  // Get the standard auth context using service role
  const authCtx = await requireCtx(req, options);
  
  // Extract the original JWT token
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader!.replace(/^Bearer\s+/i, "");
  
  // Create user-scoped Supabase client using the user's JWT
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase configuration missing");
  }
  
  // Create client with user's JWT for RLS
  const userClient = createClient(supabaseUrl, anonKey, {
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

  console.info('✅ [auth] Created user-scoped client with Supabase JWT for RLS');
  
  return {
    ...authCtx,
    userClient
  };
}

/**
 * Ensure a profile exists for the user, creating one if necessary
 */
async function ensureProfile(supabase: any, userId: UserUuid, email: string, autoCreate: boolean = true): Promise<void> {
  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.id) return; // Profile exists

  if (!autoCreate) {
    throw new Error('Profile not found and auto-creation disabled');
  }

  // Profile doesn't exist - create it
  console.info(`🔄 [auth] Creating profile for new user: ${userId}`);
  
  const { error: createError } = await supabase
    .from("profiles")
    .insert({
      id: userId, // Use auth.uid() directly as profile ID
      email: email.toLowerCase() || ""
    });

  if (createError) {
    // Handle race condition - profile might have been created
    if (createError.code === '23505') {
      console.info('🔄 [auth] Profile already exists (race condition)');
      return;
    }
    
    console.error('❌ [auth] Failed to create profile:', createError);
    throw new Error(`Failed to create user profile: ${createError.message}`);
  }

  console.info(`✅ [auth] Profile created successfully for user: ${userId}`);
}

// CORS headers for Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-business-id",
  "Access-Control-Allow-Methods": "*",
};

// JSON response helper with CORS
export function json(data: unknown, init: ResponseInit = {}) {
  const baseHeaders = { "Content-Type": "application/json", ...corsHeaders };
  
  // Safely merge incoming headers without overriding Content-Type
  const extraHeaders = init.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : (init.headers as Record<string, string> | undefined) ?? {};

  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...baseHeaders, ...extraHeaders },
  });
}

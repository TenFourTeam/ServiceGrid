// Shared authentication and business context resolution for Supabase Edge Functions
// Session token authentication only
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

type UserUuid = string;    // postgres uuid

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
  console.info('🔍 [auth] === AUTH DEBUGGING START ===');
  console.info('🔍 [auth] Request URL:', req.url);
  console.info('🔍 [auth] Request method:', req.method);
  
  // Check for session token (required)
  const sessionToken = req.headers.get("x-session-token");
  
  if (!sessionToken) {
    console.error('❌ [auth] Missing session token');
    throw new Error("Missing authentication token. Please sign in again.");
  }
  
  console.info('🔍 [auth] Session token detected, using session auth');
  return await requireCtxFromSession(req, sessionToken, options);
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
  
  // Session auth - use service role client (RLS bypassed for trusted backend operations)
  const userClient = authCtx.supaAdmin;
  console.info('✅ [auth] Using admin client for session-based operations');
  
  return {
    ...authCtx,
    userClient
  };
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

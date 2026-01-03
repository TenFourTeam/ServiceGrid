// Shared authentication and business context resolution for Supabase Edge Functions
// JWT-based authentication using Supabase Auth
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

type UserUuid = string;

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
  
  const supaAdmin = createSupabaseAdmin();
  
  // Check for JWT in Authorization header (Supabase Auth standard)
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    console.error('❌ [auth] Missing or invalid Authorization header');
    throw new Error("Missing authentication. Please sign in again.");
  }
  
  const token = authHeader.replace("Bearer ", "");
  console.info('🔍 [auth] JWT token detected, validating with Supabase Auth');
  
  // Validate JWT with Supabase Auth
  const { data: { user }, error: authError } = await supaAdmin.auth.getUser(token);
  
  if (authError || !user) {
    console.error('❌ [auth] JWT validation failed:', authError?.message);
    throw new Error("Invalid or expired session. Please sign in again.");
  }
  
  console.info('✅ [auth] JWT validated for user:', user.id);
  
  // Get profile to resolve business ID (auto-provision if missing)
  let { data: profile, error: profileError } = await supaAdmin
    .from('profiles')
    .select('id, email, default_business_id')
    .eq('id', user.id)
    .single();

  // Auto-provision profile AND business if missing (handles failed signup triggers)
  if (profileError || !profile) {
    console.warn('⚠️ [auth] Profile not found for user, auto-provisioning profile + business:', user.id);
    
    // Derive a friendly business name from user metadata or email
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const businessName = `${userName}'s Business`;
    
    // 1. Create business first (so we have the ID for the profile)
    const { data: newBusiness, error: businessError } = await supaAdmin
      .from('businesses')
      .insert({
        name: businessName,
        owner_id: user.id,
        name_customized: false
      })
      .select('id')
      .single();
    
    if (businessError) {
      console.error('❌ [auth] Failed to auto-provision business:', businessError);
      throw new Error("Failed to create business. Please contact support.");
    }
    
    console.info('✅ [auth] Auto-provisioned business:', newBusiness.id, 'named:', businessName);
    
    // 2. Create profile with default_business_id linked atomically
    const { data: newProfile, error: createError } = await supaAdmin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email?.toLowerCase(),
        full_name: userName,
        default_business_id: newBusiness.id
      })
      .select('id, email, default_business_id')
      .single();
    
    if (createError) {
      console.error('❌ [auth] Failed to auto-provision profile:', createError);
      // Clean up orphaned business
      await supaAdmin.from('businesses').delete().eq('id', newBusiness.id);
      throw new Error("Failed to create profile. Please contact support.");
    }
    
    profile = newProfile;
    console.info('✅ [auth] Auto-provisioned profile for user:', user.id, 'with business:', newBusiness.id);
  }

  // Resolve business ID
  const businessId = await resolveBusinessId(
    supaAdmin, 
    user.id, 
    profile.default_business_id,
    req,
    options
  );

  console.info('✅ [auth] Auth successful for user:', user.id, 'business:', businessId);

  return {
    userId: user.id,
    email: user.email?.toLowerCase() || undefined,
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

  // 5) Auto-create (optional) - fallback for edge cases since profile auto-provisioning now creates business
  if (!businessId) {
    if (!options?.autoCreate) {
      throw new Error('No business found and auto-creation disabled');
    }
    
    // Fetch user profile for personalized naming
    const { data: userProfile } = await supaAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userUuid)
      .single();
    
    const businessName = userProfile?.full_name 
      ? `${userProfile.full_name}'s Business`
      : `${userProfile?.email?.split('@')[0] || 'My'}'s Business`;
    
    const { data: newBusiness, error: businessError } = await supaAdmin
      .from('businesses')
      .insert({ name: businessName, owner_id: userUuid, name_customized: false })
      .select('id')
      .single();
    
    if (businessError) throw businessError;
    businessId = newBusiness.id;
    console.info(`[auth] Created new business ID: ${businessId} named: ${businessName}`);
    
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
  
  // Use admin client for all operations (JWT validated, trusted backend)
  const userClient = authCtx.supaAdmin;
  console.info('✅ [auth] Using admin client for authenticated operations');
  
  return {
    ...authCtx,
    userClient
  };
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
  
  const extraHeaders = init.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : (init.headers as Record<string, string> | undefined) ?? {};

  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...baseHeaders, ...extraHeaders },
  });
}

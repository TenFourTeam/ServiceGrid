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

export async function requireCtx(req: Request): Promise<AuthContext> {
  // Extract and verify Clerk token
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error('❌ [auth] Missing or invalid authorization header');
    throw new Response(JSON.stringify({ 
      error: { 
        code: "auth_missing", 
        message: "Missing authentication token" 
      }
    }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) {
    console.error('❌ [auth] Missing CLERK_SECRET_KEY');
    throw new Response(JSON.stringify({ 
      error: { 
        code: "config_error", 
        message: "Server configuration error" 
      }
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  let payload: any;
  try {
    payload = await verifyToken(token, { secretKey });
  } catch (e) {
    console.error('❌ [auth] Token verification failed:', e);
    throw new Response(JSON.stringify({ 
      error: { 
        code: "auth_invalid", 
        message: "Authentication failed",
        details: `${e}`
      }
    }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const clerkUserId = payload.sub as ClerkUserId;
  const email = (payload.email || payload["primary_email"] || "") as string;

  // Create admin Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Response(JSON.stringify({ error: "Supabase configuration missing" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  const supaAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  // Resolve business context
  const url = new URL(req.url);
  const candidateBusinessId = req.headers.get("X-Business-Id") || url.searchParams.get("businessId") || null;

  // 1) Resolve internal UUID via profiles (Clerk -> UUID)
  const userUuid = await resolveUserUuid(supaAdmin, clerkUserId, email);

  // 3) Resolve business using UUID (do NOT call the Clerk->UUID mapper again)
  const businessId = await resolveBusinessId(supaAdmin, userUuid, candidateBusinessId);

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
  candidate?: string | null
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

  // No business exists - use the database function for atomic creation
  const { data: defaultBiz, error: ensureErr } = await supabase.rpc('ensure_default_business');
  if (ensureErr) {
    console.error('❌ [auth] Failed to ensure default business:', ensureErr);
    throw new Response(JSON.stringify({ 
      error: { 
        code: "business_creation_failed", 
        message: "Failed to create default business" 
      }
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return defaultBiz.id;
}

async function resolveUserUuid(supabase: ReturnType<typeof createClient>, clerkUserId: ClerkUserId, email: string): Promise<UserUuid> {
  // Look up by clerk_user_id first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .limit(1)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.id) return profile.id as UserUuid;

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
    console.error('❌ [auth] Failed to create profile:', createError);
    throw new Response(JSON.stringify({ 
      error: { 
        code: "profile_creation_failed",
        message: "Failed to create user profile" 
      }
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
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
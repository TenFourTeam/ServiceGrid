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
    throw new Response(JSON.stringify({ error: "Missing Bearer token" }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) {
    throw new Response(JSON.stringify({ error: "Server configuration error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  let payload: any;
  try {
    payload = await verifyToken(token, { secretKey });
  } catch (e) {
    throw new Response(JSON.stringify({ error: `Invalid token: ${e}` }), { 
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
  const userUuid = await resolveUserUuid(supaAdmin, clerkUserId);

  // 2) Resolve business using UUID (do NOT call the Clerk->UUID mapper again)
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
  if (candidate) {
    // Verify user is a member of the specified business
    const { data } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("business_id", candidate)
      .eq("user_id", userUuid)
      .single();
    
    if (!data) {
      throw new Response(JSON.stringify({ error: "Forbidden: not a member of specified business" }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    return candidate;
  }

  // Get user's first business membership
  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userUuid)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership?.business_id) {
    return membership.business_id;
  }

  // No memberships found - create default business
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({ name: "My Business", owner_id: userUuid })
    .select("id")
    .single();

  if (businessError) throw businessError;

  // Create owner membership
  await supabase.from("business_members").insert({
    business_id: business.id,
    user_id: userUuid,
    role: "owner",
    joined_at: new Date().toISOString()
  });

  return business.id;
}

async function resolveUserUuid(supabase: ReturnType<typeof createClient>, clerkUserId: ClerkUserId): Promise<UserUuid> {
  // Look up by clerk_user_id first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .limit(1)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.id) return profile.id as UserUuid;

  // Profile doesn't exist - this should be handled by bootstrap
  throw new Response(JSON.stringify({ error: "User profile not found. Please sign in again." }), { 
    status: 404,
    headers: { "Content-Type": "application/json" }
  });
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
// Idempotent Clerk Bootstrap - UUID-First Integration
// Auth: Bearer Clerk token; CORS with allowed origins
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: { code: "method_not_allowed", message: "Method not allowed" }}, 405);
    }

    console.log('🚀 [clerk-bootstrap] Starting bootstrap process');

    // Verify Clerk token
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/, '');
    
    if (!token) {
      console.error('❌ [clerk-bootstrap] Missing bearer token');
      return json({ error: { code: "auth_error", message: "Missing bearer token" }}, 401);
    }

    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) {
      console.error('❌ [clerk-bootstrap] Missing CLERK_SECRET_KEY');
      return json({ error: { code: "config_error", message: "Missing CLERK_SECRET_KEY" }}, 500);
    }

    let payload;
    try {
      payload = await verifyToken(token, { secretKey });
    } catch (error: any) {
      console.error('❌ [clerk-bootstrap] Token verification failed:', error);
      return json({ error: { code: "auth_error", message: "Invalid Clerk token", details: error.message }}, 401);
    }

    const clerkUserId = payload.sub as string;
    const email = (payload as any).email as string | undefined;

    if (!clerkUserId) {
      console.error('❌ [clerk-bootstrap] Invalid Clerk token - no user ID');
      return json({ error: { code: "auth_error", message: "Invalid Clerk token" }}, 401);
    }

    console.log(`✅ [clerk-bootstrap] Verified Clerk user: ${clerkUserId}`);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: { code: "config_error", message: "Missing Supabase config" }}, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    // 1) Upsert profile by clerk_user_id
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, default_business_id')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (!profile) {
      console.log(`🆕 [clerk-bootstrap] Creating new profile for Clerk user: ${clerkUserId}`);
      
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({ clerk_user_id: clerkUserId, email: email || '' })
        .select('id, default_business_id')
        .single();

      if (profileError) {
        console.error('❌ [clerk-bootstrap] Profile creation failed:', profileError);
        return json({ error: { code: "profile_insert_failed", message: profileError.message }}, 400);
      }
      
      profile = newProfile;
    } else {
      console.log(`✅ [clerk-bootstrap] Found existing profile: ${profile.id}`);
    }

    // 2) Ensure default business + membership
    let businessId = profile.default_business_id;
    
    if (!businessId) {
      console.log(`🏢 [clerk-bootstrap] Creating default business for user: ${profile.id}`);
      
      // Let the trigger set the default name and flag
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({ owner_id: profile.id }) // Omit name - trigger will set 'My Business' and name_customized=false
        .select('id')
        .single();

      if (businessError) {
        console.error('❌ [clerk-bootstrap] Business creation failed:', businessError);
        return json({ error: { code: "business_insert_failed", message: businessError.message }}, 400);
      }

      businessId = business.id;

      // Update profile with default_business_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ default_business_id: businessId })
        .eq('id', profile.id);

      if (updateError) {
        console.error('❌ [clerk-bootstrap] Profile update failed:', updateError);
        return json({ error: { code: "profile_update_failed", message: updateError.message }}, 400);
      }
    }

    // 3) Ensure business membership
    const { data: membership } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('business_id', businessId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!membership) {
      console.log(`👥 [clerk-bootstrap] Creating business membership for user: ${profile.id}`);
      
      const { error: membershipError } = await supabase
        .from('business_members')
        .insert({ 
          business_id: businessId, 
          user_id: profile.id, 
          role: 'owner',
          joined_at: new Date().toISOString()
        });

      if (membershipError) {
        console.error('❌ [clerk-bootstrap] Membership creation failed:', membershipError);
        return json({ error: { code: "membership_insert_failed", message: membershipError.message }}, 400);
      }
    }

    console.log(`🎉 [clerk-bootstrap] Bootstrap complete - User: ${profile.id}, Business: ${businessId}`);

    return json({
      success: true,
      data: {
        userUuid: profile.id,
        businessId: businessId,
        message: "Bootstrap successful"
      }
    }, 200);

  } catch (error: any) {
    console.error('💥 [clerk-bootstrap] Unexpected error:', error);
    
    // Provide more specific error messages based on error type
    if (error?.code === '23503') {
      return json({ 
        error: { 
          code: "database_constraint_error", 
          message: "Database constraint violation. Please try signing in again.",
          details: error.message 
        }
      }, 400);
    }
    
    if (error?.message?.includes('not authenticated') || error?.message?.includes('Invalid')) {
      return json({ 
        error: { 
          code: "auth_error", 
          message: "Authentication failed. Please sign in again.",
          details: error.message 
        }
      }, 401);
    }
    
    const message = error?.message || "Bootstrap failed";
    return json({ 
      error: { 
        code: "bootstrap_error", 
        message: "Bootstrap failed. Please try signing in again.",
        details: message 
      }
    }, 500);
  }
});

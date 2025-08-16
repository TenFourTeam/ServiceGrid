// Idempotent Clerk Bootstrap - UUID-First Integration
// Auth: Bearer Clerk token; CORS with allowed origins
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: { code: "method_not_allowed", message: "Method not allowed" }}, 405);
    }

    console.log('🚀 [clerk-bootstrap] Starting bootstrap process');

    // Extract and verify Clerk token manually (don't use requireCtx since profile might not exist)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error('❌ [clerk-bootstrap] Missing or invalid authorization header');
      return json({ error: { code: "auth_missing", message: "Missing authentication token" }}, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) {
      console.error('❌ [clerk-bootstrap] Missing CLERK_SECRET_KEY');
      return json({ error: { code: "config_error", message: "Server configuration error" }}, 500);
    }

    let payload: any;
    try {
      payload = await verifyToken(token, { secretKey });
    } catch (e) {
      console.error('❌ [clerk-bootstrap] Token verification failed:', e);
      return json({ error: { code: "auth_invalid", message: "Authentication failed" }}, 401);
    }

    const clerkUserId = payload.sub as string;
    const email = (payload.email || payload["primary_email"] || "") as string;

    console.log(`📧 [clerk-bootstrap] Extracted email: "${email}"`);
    console.log(`✅ [clerk-bootstrap] Verified Clerk user: ${clerkUserId}`);

    // Create admin Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: { code: "config_error", message: "Supabase configuration missing" }}, 500);
    }
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });
    
    // 1) Check if profile exists, create if needed
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, default_business_id, full_name, email, clerk_user_id')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    let userId: string;

    if (!profile) {
      console.log('🆕 [clerk-bootstrap] Profile not found, creating new profile');
      
      // Create new profile with Clerk user ID as primary key initially
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          clerk_user_id: clerkUserId,
          email: email.toLowerCase(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, default_business_id, full_name')
        .single();

      if (profileError) {
        console.error('❌ [clerk-bootstrap] Profile creation failed:', profileError);
        return json({ error: { code: "profile_creation_failed", message: profileError.message }}, 400);
      }

      profile = newProfile;
      userId = newProfile.id;
      console.log(`✅ [clerk-bootstrap] Created new profile: ${userId}`);
    } else {
      userId = profile.id;
      console.log(`✅ [clerk-bootstrap] Found existing profile: ${userId}`);
    }

    // 2) Ensure default business exists using direct service role operations
    console.log("🏢 [clerk-bootstrap] Ensuring default business");
    
    // Check for existing owner membership
    const { data: existingMembership } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    let businessId = existingMembership?.business_id;

    if (!businessId) {
      console.log("🆕 [clerk-bootstrap] Creating new business and membership");
      
      // Create new business
      const { data: newBusiness, error: businessError } = await supabase
        .from('businesses')
        .insert({ 
          name: 'My Business',
          owner_id: userId 
        })
        .select('id')
        .single();

      if (businessError) {
        console.error('❌ [clerk-bootstrap] Business creation failed:', businessError);
        return json({ error: { code: "business_insert_failed", message: businessError.message }}, 400);
      }

      businessId = newBusiness.id;

      // Create owner membership
      const { error: membershipError } = await supabase
        .from('business_members')
        .insert({
          user_id: userId,
          business_id: businessId,
          role: 'owner',
          joined_at: new Date().toISOString()
        });

      if (membershipError && membershipError.code !== '23505') { // Ignore duplicate key errors
        console.error('❌ [clerk-bootstrap] Membership creation failed:', membershipError);
        return json({ error: { code: "membership_insert_failed", message: membershipError.message }}, 400);
      }

      // Update profile default_business_id if not set
      if (!profile.default_business_id) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ default_business_id: businessId })
          .eq('id', userId);

        if (profileUpdateError) {
          console.warn('⚠️ [clerk-bootstrap] Profile update failed (non-blocking):', profileUpdateError);
        }
      }
    } else {
      console.log(`✅ [clerk-bootstrap] Found existing business: ${businessId}`);
    }

    // 3) Bootstrap complete - profile and business now guaranteed to exist
    console.log(`🎉 [clerk-bootstrap] Bootstrap complete - User: ${userId}, Business: ${businessId}`);

    return json({
      success: true,
      data: {
        userUuid: userId,
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

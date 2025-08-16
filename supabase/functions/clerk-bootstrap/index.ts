// Idempotent Clerk Bootstrap - UUID-First Integration
// Auth: Bearer Clerk token; CORS with allowed origins
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: { code: "method_not_allowed", message: "Method not allowed" }}, 405);
    }

    console.log('🚀 [clerk-bootstrap] Starting bootstrap process');

    const { userId, supaAdmin: supabase, clerkUserId, email } = await requireCtx(req);
    
    console.log(`📧 [clerk-bootstrap] Extracted email: "${email}"`);
    console.log(`✅ [clerk-bootstrap] Verified Clerk user: ${clerkUserId}`);

    // 1) Get the existing profile (already resolved by requireCtx)
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, default_business_id, full_name')
      .eq('id', userId)
      .single();

    if (!profile) {
      console.error('❌ [clerk-bootstrap] Profile not found - this should not happen after requireCtx');
      return json({ error: { code: "profile_not_found", message: "Profile not found" }}, 500);
    }
    
    console.log(`✅ [clerk-bootstrap] Found existing profile: ${profile.id}`);

    // 2) Ensure default business exists using direct service role operations
    console.log("🏢 [clerk-bootstrap] Ensuring default business");
    
    // Check for existing owner membership
    const { data: existingMembership } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', profile.id)
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
          owner_id: profile.id 
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
          user_id: profile.id,
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
          .eq('id', profile.id);

        if (profileUpdateError) {
          console.warn('⚠️ [clerk-bootstrap] Profile update failed (non-blocking):', profileUpdateError);
        }
      }
    } else {
      console.log(`✅ [clerk-bootstrap] Found existing business: ${businessId}`);
    }

    // 3) Bootstrap complete - profile and business already ensured by requireCtx
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

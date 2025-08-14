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
    
    // Debug: Log the full payload to understand Google OAuth token structure
    console.log('🔍 [clerk-bootstrap] Full Clerk token payload keys:', Object.keys(payload as any));
    console.log('🔍 [clerk-bootstrap] Token payload sample:', JSON.stringify(payload, null, 2));
    
    // Extract email with multiple fallback strategies for different OAuth providers
    let email = '';
    const payloadAny = payload as any;
    
    // Try different possible email locations in the token
    if (payloadAny.email) {
      email = payloadAny.email;
    } else if (payloadAny.email_addresses && Array.isArray(payloadAny.email_addresses) && payloadAny.email_addresses.length > 0) {
      // Clerk sometimes stores emails in an array
      email = payloadAny.email_addresses[0].email_address || payloadAny.email_addresses[0];
    } else if (payloadAny.primary_email_address) {
      email = payloadAny.primary_email_address;
    } else if (payloadAny.emailAddresses && Array.isArray(payloadAny.emailAddresses) && payloadAny.emailAddresses.length > 0) {
      email = payloadAny.emailAddresses[0].emailAddress || payloadAny.emailAddresses[0];
    }
    
    console.log(`📧 [clerk-bootstrap] Extracted email: "${email}"`);

    if (!clerkUserId) {
      console.error('❌ [clerk-bootstrap] Invalid Clerk token - no user ID');
      return json({ error: { code: "auth_error", message: "Invalid Clerk token" }}, 401);
    }
    
    // Continue without email for now - profiles can be created without it
    if (!email) {
      console.log('⚠️ [clerk-bootstrap] No email found in token, continuing without it');
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
      .select('id, default_business_id, full_name')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (!profile) {
      console.log(`🆕 [clerk-bootstrap] Creating new profile for Clerk user: ${clerkUserId}`);
      
      console.log('📝 [clerk-bootstrap] Inserting new profile with service role access');
      
      const profileData: any = { clerk_user_id: clerkUserId };
      if (email) {
        profileData.email = email;
      }
      
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select('id, default_business_id, full_name')
        .single();

      if (profileError) {
        console.error('❌ [clerk-bootstrap] Profile creation failed:', profileError);
        console.error('❌ [clerk-bootstrap] Full error details:', JSON.stringify(profileError));
        console.error('❌ [clerk-bootstrap] Profile data attempted:', JSON.stringify(profileData));
        return json({ error: { code: "profile_insert_failed", message: profileError.message, details: profileError }}, 400);
      }
      
      profile = newProfile;
    } else {
      console.log(`✅ [clerk-bootstrap] Found existing profile: ${profile.id}`);
    }

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

    // 3) One-time name sync from Clerk to DB (only if profile has no name)
    // Extract name with multiple fallback strategies for different OAuth providers
    let clerkFirstName = '';
    let clerkLastName = '';
    let clerkFullName = '';
    
    // Try different possible name locations in the token
    if (payloadAny.first_name) {
      clerkFirstName = payloadAny.first_name;
    } else if (payloadAny.firstName) {
      clerkFirstName = payloadAny.firstName;
    } else if (payloadAny.given_name) {
      clerkFirstName = payloadAny.given_name;
    }
    
    if (payloadAny.last_name) {
      clerkLastName = payloadAny.last_name;
    } else if (payloadAny.lastName) {
      clerkLastName = payloadAny.lastName;
    } else if (payloadAny.family_name) {
      clerkLastName = payloadAny.family_name;
    }
    
    // Construct full name from parts or use direct full name
    if (clerkFirstName || clerkLastName) {
      clerkFullName = [clerkFirstName, clerkLastName].filter(Boolean).join(' ').trim();
    } else if (payloadAny.full_name) {
      clerkFullName = payloadAny.full_name;
    } else if (payloadAny.fullName) {
      clerkFullName = payloadAny.fullName;
    } else if (payloadAny.name) {
      clerkFullName = payloadAny.name;
    }
    
    console.log(`👤 [clerk-bootstrap] Extracted name: "${clerkFullName}" (first: "${clerkFirstName}", last: "${clerkLastName}")`);

    if (clerkFullName && !profile.full_name) {
      console.log(`📝 [clerk-bootstrap] Initial name sync from Clerk: "${clerkFullName}"`);
      
      const { error: nameError } = await supabase
        .from('profiles')
        .update({ full_name: clerkFullName })
        .eq('id', profile.id)
        .is('full_name', null); // Only update if no name exists

      if (nameError) {
        console.warn('⚠️ [clerk-bootstrap] Name sync failed (non-blocking):', nameError);
        // Don't fail bootstrap for name sync issues
      } else {
        console.log(`✅ [clerk-bootstrap] Name synced successfully`);
      }
    }

    // 4) Bootstrap complete - all operations handled directly

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

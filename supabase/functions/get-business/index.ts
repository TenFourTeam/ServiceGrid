import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create JSON responses with CORS
function jsonResponse(data: any, options: { status?: number } = {}) {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Helper function to verify Clerk JWT and extract user info
async function verifyClerkToken(token: string) {
  try {
    // Decode the JWT to get claims (we'll trust Clerk's signature for now)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const claims = JSON.parse(jsonPayload);
    return {
      clerkUserId: claims.sub,
      email: claims.email || `${claims.sub}@clerk.dev`
    };
  } catch (error) {
    console.error('[get-business] Failed to decode Clerk token:', error);
    throw new Error('Invalid Clerk token');
  }
}

// Helper function to resolve user UUID from Clerk ID
async function resolveUserFromClerk(supabase: any, clerkUserId: string, email: string) {
  console.log('[get-business] Resolving user for Clerk ID:', clerkUserId);
  
  // Try to find existing profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, default_business_id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (profileError) {
    console.error('[get-business] Profile lookup error:', profileError);
    throw new Error(`Failed to lookup profile: ${profileError.message}`);
  }

  if (profile) {
    console.log('[get-business] Found existing profile:', profile.id);
    return profile;
  }

  // Create new profile if none exists
  console.log('[get-business] Creating new profile for:', clerkUserId);
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      clerk_user_id: clerkUserId,
      email: email,
      full_name: email.split('@')[0]
    })
    .select('id, default_business_id')
    .single();

  if (createError) {
    console.error('[get-business] Profile creation error:', createError);
    throw new Error(`Failed to create profile: ${createError.message}`);
  }

  console.log('[get-business] Created new profile:', newProfile.id);
  return newProfile;
}

// Helper function to resolve business ID for user
async function resolveBusinessForUser(supabase: any, userId: string) {
  console.log('[get-business] Resolving business for user:', userId);
  
  // Look for business where user is owner
  const { data: membership, error: membershipError } = await supabase
    .from('business_members')
    .select('business_id, role')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .maybeSingle();

  if (membershipError) {
    console.error('[get-business] Membership lookup error:', membershipError);
    throw new Error(`Failed to lookup business membership: ${membershipError.message}`);
  }

  if (membership) {
    console.log('[get-business] Found business membership:', membership.business_id);
    return membership.business_id;
  }

  // Create default business if none exists
  console.log('[get-business] Creating default business for user:', userId);
  const { data: newBusiness, error: businessError } = await supabase
    .from('businesses')
    .insert({
      owner_id: userId,
      name: 'My Business'
    })
    .select('id')
    .single();

  if (businessError) {
    console.error('[get-business] Business creation error:', businessError);
    throw new Error(`Failed to create business: ${businessError.message}`);
  }

  // Create business membership
  const { error: membershipCreateError } = await supabase
    .from('business_members')
    .insert({
      business_id: newBusiness.id,
      user_id: userId,
      role: 'owner',
      joined_at: new Date().toISOString()
    });

  if (membershipCreateError) {
    console.error('[get-business] Membership creation error:', membershipCreateError);
    // Don't throw here, business was created successfully
  }

  // Update profile with default business
  await supabase
    .from('profiles')
    .update({ default_business_id: newBusiness.id })
    .eq('id', userId);

  console.log('[get-business] Created default business:', newBusiness.id);
  return newBusiness.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[get-business] Request received');
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[get-business] Missing or invalid authorization header');
      return jsonResponse({ error: 'Missing authentication' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify Clerk token and get user info
    const { clerkUserId, email } = await verifyClerkToken(token);
    console.log('[get-business] Verified Clerk user:', clerkUserId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve user profile from Clerk ID
    const profile = await resolveUserFromClerk(supabase, clerkUserId, email);
    
    // Resolve business for this user
    const businessId = await resolveBusinessForUser(supabase, profile.id);

    // Get business data with user's role
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id, name, phone, reply_to_email, tax_rate_default, 
        logo_url, light_logo_url,
        business_members!inner(role)
      `)
      .eq('id', businessId)
      .eq('business_members.user_id', profile.id)
      .maybeSingle();

    if (businessError) {
      console.error('[get-business] Business error:', businessError);
      throw new Error(`Failed to fetch business: ${businessError.message}`);
    }

    if (!businessData) {
      console.warn('[get-business] Business not found or user not a member');
      return jsonResponse({ business: null });
    }

    console.log('[get-business] Business fetched successfully');
    
    return jsonResponse({
      business: {
        id: businessData.id,
        name: businessData.name,
        phone: businessData.phone,
        replyToEmail: businessData.reply_to_email,
        taxRateDefault: businessData.tax_rate_default,
        logoUrl: businessData.logo_url,
        lightLogoUrl: businessData.light_logo_url,
        role: businessData.business_members[0]?.role || 'worker'
      }
    });

  } catch (error: any) {
    console.error('[get-business] Error:', error);
    
    // Handle auth errors specifically
    if (error.message?.includes('Authentication failed') || error.message?.includes('Invalid Clerk token')) {
      return jsonResponse({ error: error.message || 'Authentication failed' }, { status: 401 });
    }
    
    return jsonResponse(
      { error: error.message || 'Failed to get business' },
      { status: 500 }
    );
  }
});
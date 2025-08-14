import { serve } from "https://deno.land/std/http/server.ts";
import { requireCtx } from "../_lib/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return json({ error: { code: 'method_not_allowed', message: 'Method not allowed' }}, 405);
    }

    console.log('🔍 [profile-get] Starting profile fetch');

    const ctx = await requireCtx(req);
    
    console.log(`✅ [profile-get] Auth context resolved - User: ${ctx.userId}, Business: ${ctx.businessId}`);

    const { data: profile, error: profileError } = await ctx.supaAdmin
      .from('profiles')
      .select('id, full_name, phone_e164, business_name, business_name_customized, default_business_id')
      .eq('id', ctx.userId)
      .maybeSingle();

    if (profileError) {
      console.error('❌ [profile-get] Database error:', profileError);
      return json({ error: { code: 'db_error', message: profileError.message }}, 500);
    }

    if (!profile) {
      console.error('❌ [profile-get] Profile not found for user:', ctx.userId);
      return json({ error: { code: 'not_found', message: 'Profile not found' }}, 404);
    }

    console.log(`🎉 [profile-get] Profile retrieved successfully for user: ${ctx.userId}`);

    return json({ data: profile }, 200);

  } catch (error: any) {
    console.error('💥 [profile-get] Unexpected error:', error);
    
    // Handle Response objects from requireCtx
    if (error instanceof Response) {
      return error;
    }
    
    // Handle different types of auth errors with proper status codes
    if (error?.message?.includes('not found') || error?.message?.includes('not owned by current user')) {
      return json({ error: { code: 'forbidden', message: 'Access denied' }}, 403);
    }
    
    if (error?.message?.includes('Invalid') || error?.message?.includes('Unauthorized')) {
      return json({ error: { code: 'auth_error', message: 'Invalid authentication' }}, 401);
    }

    return json({ 
      error: { 
        code: 'server_error', 
        message: error?.message || 'Profile fetch failed',
        action: "retry"
      }
    }, 500);
  }
});
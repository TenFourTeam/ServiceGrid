import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireCtxWithUserClient, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 [test-rls-auth] Testing RLS with user-scoped client...');
    
    // Use the new hybrid auth approach
    const { userId, clerkUserId, userClient, supaAdmin } = await requireCtxWithUserClient(req);
    
    console.log('🧪 [test-rls-auth] Auth context:', { userId, clerkUserId });
    
    // Test 1: Check auth.uid() directly using RLS client
    const { data: authUidTest, error: authUidError } = await userClient
      .rpc('debug_auth_state');
    
    if (authUidError) {
      console.error('❌ [test-rls-auth] Auth UID test failed:', authUidError);
    } else {
      console.log('✅ [test-rls-auth] Auth UID test result:', authUidTest);
    }
    
    // Test 2: Query profiles table with RLS client (should work with RLS policies)
    const { data: profilesRLS, error: profilesRLSError } = await userClient
      .from('profiles')
      .select('id, clerk_user_id')
      .limit(1);
    
    if (profilesRLSError) {
      console.error('❌ [test-rls-auth] Profiles RLS test failed:', profilesRLSError);
    } else {
      console.log('✅ [test-rls-auth] Profiles RLS test result:', profilesRLS);
    }
    
    // Test 3: Query profiles table with service role (for comparison)
    const { data: profilesAdmin, error: profilesAdminError } = await supaAdmin
      .from('profiles')
      .select('id, clerk_user_id')
      .eq('id', userId)
      .limit(1);
    
    if (profilesAdminError) {
      console.error('❌ [test-rls-auth] Profiles admin test failed:', profilesAdminError);
    } else {
      console.log('✅ [test-rls-auth] Profiles admin test result:', profilesAdmin);
    }
    
    return json({
      success: true,
      tests: {
        authUid: {
          success: !authUidError,
          data: authUidTest,
          error: authUidError?.message
        },
        profilesRLS: {
          success: !profilesRLSError,
          data: profilesRLS,
          error: profilesRLSError?.message
        },
        profilesAdmin: {
          success: !profilesAdminError,
          data: profilesAdmin,
          error: profilesAdminError?.message
        }
      },
      context: {
        userId,
        clerkUserId
      }
    });
    
  } catch (error: any) {
    console.error('❌ [test-rls-auth] Test failed:', error);
    return json(
      { 
        success: false, 
        error: error.message || 'Test failed',
        context: error.stack
      },
      { status: 500 }
    );
  }
});
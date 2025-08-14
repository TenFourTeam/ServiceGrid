import { serve } from "https://deno.land/std/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    
    console.log(JSON.stringify({
      evt: 'profile.get',
      userUuid: ctx.userUuid,
      businessId: ctx.businessId
    }));

    const { data: profile, error: profileError } = await ctx.supaAdmin
      .from('profiles')
      .select('id, full_name, phone_e164')
      .eq('id', ctx.userUuid)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return json({ error: { code: 'db_error', message: profileError.message }}, 400);
    }

    return json({ data: profile }, 200);
  } catch (error: any) {
    console.error('Profile get error:', error);
    return json(
      { error: { code: 'auth_error', message: error?.message || 'Unauthorized' }}, 
      error?.status ?? 401
    );
  }
});
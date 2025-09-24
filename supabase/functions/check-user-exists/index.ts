import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { userId, supaAdmin } = await requireCtx(req);
    const { email, businessId } = await req.json();

    if (!email || !businessId) {
      return json({ error: 'Email and business ID are required' }, { status: 400 });
    }

    console.log(`🔍 Checking if user exists with email: ${email}`);

    // Verify the requesting user can manage this business
    const { data: membership } = await supaAdmin
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    if (!membership) {
      return json({ error: 'Not authorized to manage this business' }, { status: 403 });
    }

    // Check if a user with this email exists
    const { data: profile, error: profileError } = await supaAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking user existence:', profileError);
      return json({ error: 'Database error' }, { status: 500 });
    }

    const userExists = !!profile;
    console.log(`👤 User ${email} ${userExists ? 'exists' : 'does not exist'}`);

    if (userExists) {
      // Check if they're already a member of this business
      const { data: existingMember } = await supaAdmin
        .from('business_members')
        .select('id, role')
        .eq('business_id', businessId)
        .eq('user_id', (profile as any).id)
        .single();

      if (existingMember) {
        return json({
          exists: true,
          alreadyMember: true,
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.full_name,
            role: existingMember.role
          }
        });
      }

      return json({
        exists: true,
        alreadyMember: false,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name
        }
      });
    }

    return json({
      exists: false,
      alreadyMember: false
    });

  } catch (error) {
    console.error('Error in check-user-exists:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
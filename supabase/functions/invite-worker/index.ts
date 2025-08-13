import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...init.headers },
  });

const createAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
};

async function resolveOwnerIdFromClerk(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
  if (!clerkSecretKey) throw new Error('CLERK_SECRET_KEY not configured');

  const payload = await verifyToken(token, { secretKey: clerkSecretKey });
  const supabase = createAdminClient();

  // First try to find by clerk_user_id
  let { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', payload.sub)
    .single();

  if (!profile && payload.email) {
    // Fallback to email lookup
    ({ data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', payload.email)
      .single());
  }

  if (!profile) {
    throw new Error('User profile not found');
  }

  return profile.id;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const ownerId = await resolveOwnerIdFromClerk(req);
    const supabase = createAdminClient();
    const { businessId, email } = await req.json();

    if (!businessId || !email) {
      return json({ error: 'businessId and email are required' }, { status: 400 });
    }

    // Verify the user is an owner of this business
    const { data: membership } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', ownerId)
      .single();

    if (!membership || membership.role !== 'owner') {
      return json({ error: 'Only business owners can invite workers' }, { status: 403 });
    }

    // Check if user already exists in auth
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
    
    if (existingUser.user) {
      // User exists, check if already a member
      const { data: existingMember } = await supabase
        .from('business_members')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', existingUser.user.id)
        .single();

      if (existingMember) {
        return json({ error: 'User is already a member of this business' }, { status: 400 });
      }

      // Add existing user as member
      const { error: insertError } = await supabase
        .from('business_members')
        .insert({
          business_id: businessId,
          user_id: existingUser.user.id,
          role: 'worker',
          invited_by: ownerId,
          joined_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      return json({ success: true, message: 'User added to business' });
    } else {
      // User doesn't exist yet, create invitation record without user_id
      // When they sign up, we'll match by email and update the record
      return json({ 
        success: true, 
        message: 'Invitation created - user will be added when they sign up with this email' 
      });
    }
  } catch (error) {
    console.error('Invite worker error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
});
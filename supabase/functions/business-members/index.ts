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

  try {
    const ownerId = await resolveOwnerIdFromClerk(req);
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');

    if (!businessId) {
      return json({ error: 'business_id is required' }, { status: 400 });
    }

    // Verify user has access to this business
    const { data: membership } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', ownerId)
      .single();

    if (!membership) {
      return json({ error: 'Not authorized' }, { status: 403 });
    }

    if (req.method === 'GET') {
      // Get all members for this business
      const { data: members, error } = await supabase
        .from('business_members')
        .select(`
          id,
          business_id,
          user_id,
          role,
          invited_at,
          joined_at,
          invited_by,
          profiles!business_members_user_id_fkey(email)
        `)
        .eq('business_id', businessId)
        .order('role', { ascending: false }) // owners first
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching members:', error);
        return json({ error: 'Failed to fetch members' }, { status: 500 });
      }

      const formattedMembers = members?.map(member => ({
        id: member.id,
        business_id: member.business_id,
        user_id: member.user_id,
        role: member.role,
        invited_at: member.invited_at,
        joined_at: member.joined_at,
        invited_by: member.invited_by,
        email: member.profiles?.email,
      })) || [];

      return json({ members: formattedMembers });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Business members error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
});
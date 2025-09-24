import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireCtx } from "../_lib/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  console.log(`👥 get-all-users function called: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supaAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { userId } = await requireCtx(req);

    console.log(`👥 Fetching all users for user selection`);

    // Get all profiles with basic info for user selection
    const { data: users, error } = await supaAdmin
      .from('profiles')
      .select('id, email, full_name')
      .order('email');

    if (error) {
      console.error('Error fetching users:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Filter out the current user from the list
    const filteredUsers = users.filter((user: any) => user.id !== userId);

    console.log(`✅ Found ${filteredUsers.length} users for selection`);

    return new Response(JSON.stringify({ users: filteredUsers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in get-all-users:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { userId, supaAdmin } = await requireCtx(req);

    console.log(`👥 Fetching all users for user selection`);

    // Get all profiles with basic info for user selection
    const { data: users, error } = await supaAdmin
      .from('profiles')
      .select('id, email, full_name')
      .order('email');

    if (error) {
      console.error('Error fetching users:', error);
      return json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Filter out the current user from the list
    const filteredUsers = users.filter((user: any) => user.id !== userId);

    console.log(`✅ Found ${filteredUsers.length} users for selection`);

    return json({ users: filteredUsers });

  } catch (error) {
    console.error('Error in get-all-users:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
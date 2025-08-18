import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[business-members] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[business-members] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Get all members for this business
      const { data: members, error, count } = await supabase
        .from('business_members')
        .select(`
          id,
          business_id,
          user_id,
          role,
          invited_at,
          joined_at,
          invited_by,
          profiles!business_members_user_id_fkey(email, full_name)
        `, { count: 'exact' })
        .eq('business_id', ctx.businessId)
        .order('role', { ascending: false }) // owners first
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('[business-members] GET error:', error);
        throw new Error(`Failed to fetch members: ${error.message}`);
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
        name: member.profiles?.full_name,
      })) || [];

      console.log('[business-members] Fetched', formattedMembers.length, 'members');
      return json({ members: formattedMembers, count: count || 0 });
    }


    if (req.method === 'DELETE') {
      let body;
      try {
        body = await req.json();
        if (!body) {
          throw new Error('Request body is empty');
        }
      } catch (jsonError) {
        console.error('[business-members] JSON parsing error:', jsonError);
        return json({ error: 'Invalid JSON in request body' }, { status: 400 });
      }

      const { memberId } = body;

      if (!memberId) {
        return json({ error: 'Member ID is required' }, { status: 400 });
      }

      // Verify user is business owner
      const { data: membership } = await supabase
        .from('business_members')
        .select('role')
        .eq('business_id', ctx.businessId)
        .eq('user_id', ctx.userId)
        .single();

      if (!membership || membership.role !== 'owner') {
        return json({ error: 'Only business owners can remove members' }, { status: 403 });
      }

      // Remove member
      const { error } = await supabase
        .from('business_members')
        .delete()
        .eq('id', memberId)
        .eq('business_id', ctx.businessId);

      if (error) {
        console.error('[business-members] DELETE error:', error);
        throw new Error(`Failed to remove member: ${error.message}`);
      }

      console.log('[business-members] Member removed:', memberId);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[business-members] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});
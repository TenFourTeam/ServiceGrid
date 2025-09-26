import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
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
      // Get business owner first
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select(`
          id,
          owner_id,
          profiles!businesses_owner_id_fkey(email, full_name)
        `)
        .eq('id', ctx.businessId)
        .single();

      if (businessError) {
        console.error('[business-members] Business fetch error:', businessError);
        throw new Error(`Failed to fetch business: ${businessError.message}`);
      }

      // Get worker members
      const { data: workers, error: workersError, count: workersCount } = await supabase
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
        .order('joined_at', { ascending: true });

      if (workersError) {
        console.error('[business-members] Workers fetch error:', workersError);
        throw new Error(`Failed to fetch workers: ${workersError.message}`);
      }

      // Combine owner + workers
      const allMembers = [];
      
      // Add owner first
      if (business) {
        allMembers.push({
          id: `owner-${business.owner_id}`, // Special ID for owner
          business_id: business.id,
          user_id: business.owner_id,
          role: 'owner',
          invited_at: null, // Owners aren't invited
          joined_at: null, // Owners don't join via invitation
          invited_by: null,
          email: (business.profiles as any)?.email,
          name: (business.profiles as any)?.full_name,
        });
      }

      // Add workers
      const formattedWorkers = workers?.map(worker => ({
        id: worker.id,
        business_id: worker.business_id,
        user_id: worker.user_id,
        role: worker.role,
        invited_at: worker.invited_at,
        joined_at: worker.joined_at,
        invited_by: worker.invited_by,
        email: (worker.profiles as any)?.email,
        name: (worker.profiles as any)?.full_name,
      })) || [];

      allMembers.push(...formattedWorkers);

      console.log('[business-members] Fetched', allMembers.length, 'members (1 owner +', formattedWorkers.length, 'workers)');
      return json({ members: allMembers, count: allMembers.length });
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
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', ctx.businessId)
        .single();

      if (!business || business.owner_id !== ctx.userId) {
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
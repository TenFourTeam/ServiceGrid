import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[timesheet-crud] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[timesheet-crud] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const targetUserId = url.searchParams.get('userId');
      
      let queryUserId = ctx.userId;
      let memberInfo = null;
      
      // If requesting a specific user's timesheet
      if (targetUserId) {
        // If viewing another user's timesheet, verify the requester is an owner
        if (targetUserId !== ctx.userId) {
          const { data: memberData, error: roleError } = await supabase
            .from('business_members')
            .select('role')
            .eq('business_id', ctx.businessId)
            .eq('user_id', ctx.userId)
            .single();
          
          if (roleError || !memberData || memberData.role !== 'owner') {
            throw new Error('Only business owners can view other members\' timesheets');
          }
        }
        
        // Get the target user's info
        const { data: userInfo, error: userError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', targetUserId)
          .single();
          
        if (userError || !userInfo) {
          throw new Error('Target user not found');
        }
        
        // Verify the target user is a member of this business
        const { data: targetMemberData, error: targetMemberError } = await supabase
          .from('business_members')
          .select('user_id')
          .eq('business_id', ctx.businessId)
          .eq('user_id', targetUserId)
          .single();
          
        if (targetMemberError || !targetMemberData) {
          throw new Error('Target user is not a member of this business');
        }
        
        queryUserId = targetUserId;
        memberInfo = userInfo;
      }

      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('business_id', ctx.businessId)
        .eq('user_id', queryUserId)
        .order('clock_in_time', { ascending: false });

      if (error) {
        console.error('[timesheet-crud] GET error:', error);
        throw new Error(`Failed to fetch timesheet entries: ${error.message}`);
      }

      console.log('[timesheet-crud] Fetched', data?.length || 0, 'timesheet entries for user:', queryUserId);
      return json({ entries: data || [], memberInfo });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { notes } = body;

      const { data, error } = await supabase
        .from('timesheet_entries')
        .insert([{
          business_id: ctx.businessId,
          user_id: ctx.userId,
          notes: notes || null,
        }])
        .select()
        .single();

      if (error) {
        console.error('[timesheet-crud] POST error:', error);
        throw new Error(`Failed to clock in: ${error.message}`);
      }

      console.log('[timesheet-crud] Clocked in:', data.id);
      return json({ entry: data });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { entryId, notes, action } = body;

      if (action === 'clock_out') {
        // Clock out - workers and owners can do this
        const { data, error } = await supabase
          .from('timesheet_entries')
          .update({
            clock_out_time: new Date().toISOString(),
            notes: notes || null,
          })
          .eq('id', entryId)
          .eq('user_id', ctx.userId)
          .eq('business_id', ctx.businessId)
          .select()
          .single();

        if (error) {
          console.error('[timesheet-crud] PUT clock_out error:', error);
          throw new Error(`Failed to clock out: ${error.message}`);
        }

        console.log('[timesheet-crud] Clocked out:', data.id);
        return json({ entry: data });
      } else if (action === 'edit') {
        // Edit entry - only owners can do this
        const { clockInTime, clockOutTime, notes: editNotes, targetUserId } = body;
        
        // Check if user is owner
        const { data: memberData, error: roleError } = await supabase
          .from('business_members')
          .select('role')
          .eq('business_id', ctx.businessId)
          .eq('user_id', ctx.userId)
          .single();
        
        if (roleError || !memberData || memberData.role !== 'owner') {
          throw new Error('Only business owners can edit timesheet entries');
        }

        const updateData: any = {};
        if (clockInTime) updateData.clock_in_time = clockInTime;
        if (clockOutTime) updateData.clock_out_time = clockOutTime;
        if (editNotes !== undefined) updateData.notes = editNotes;

        const { data, error } = await supabase
          .from('timesheet_entries')
          .update(updateData)
          .eq('id', entryId)
          .eq('business_id', ctx.businessId)
          .select()
          .single();

        if (error) {
          console.error('[timesheet-crud] PUT edit error:', error);
          throw new Error(`Failed to edit entry: ${error.message}`);
        }

        console.log('[timesheet-crud] Edited entry:', data.id);
        return json({ entry: data });
      } else {
        throw new Error('Invalid action for PUT request');
      }
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[timesheet-crud] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});
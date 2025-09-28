import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ok = (data: unknown, status = 200) => json(data, { status });

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
      // Fetch business (owner + created_at)
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, owner_id, created_at')
        .eq('id', ctx.businessId)
        .single();

      if (businessError || !business) {
        console.error('[business-members] Error fetching business:', businessError);
        return ok({ error: 'Business not found' }, 404);
      }

      // Ensure caller is owner OR a member (defense-in-depth since service role bypasses RLS)
      const isOwner = business.owner_id === ctx.userId;
      let isMember = false;
      if (!isOwner) {
        const { data: membershipRow, error: membershipErr } = await supabase
          .from('business_permissions')
          .select('user_id')
          .eq('business_id', ctx.businessId)
          .eq('user_id', ctx.userId)
          .maybeSingle();

        if (membershipErr) {
          console.error('[business-members] Error checking membership:', membershipErr);
          return ok({ error: 'Failed to verify membership' }, 500);
        }
        isMember = !!membershipRow;
      }

      if (!isOwner && !isMember) {
        return ok({ error: 'Forbidden' }, 403);
      }

      // Fetch owner profile (remove the bad column name)
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', business.owner_id)
        .single();

      if (ownerError || !ownerProfile) {
        console.error('[business-members] Error fetching owner profile:', ownerError);
        // Fallback: still return owner with minimal info
        return ok({ error: 'Failed to fetch owner profile' }, 500);
      }

      // Fetch permissions
      const { data: businessPermissions, error: permissionsError } = await supabase
        .from('business_permissions')
        .select('user_id, granted_at, granted_by')
        .eq('business_id', ctx.businessId);

      if (permissionsError) {
        console.error('[business-members] Error fetching business permissions:', permissionsError);
        return ok({ error: 'Failed to fetch worker members' }, 500);
      }

      // Fetch worker profiles, excluding owner to avoid duplication
      const workerUserIds = (businessPermissions ?? [])
        .map(p => p.user_id)
        .filter((uid) => uid !== ownerProfile.id);

      let workerProfiles: { id: string; email: string; full_name: string }[] = [];
      if (workerUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', workerUserIds);

        if (profilesError) {
          console.error('[business-members] Error fetching worker profiles:', profilesError);
          return ok({ error: 'Failed to fetch worker profiles' }, 500);
        }
        workerProfiles = profiles ?? [];
      }

      // Shape members
      const members = [
        {
          id: `owner-${ownerProfile.id}`,
          business_id: business.id,
          user_id: ownerProfile.id,
          role: 'owner' as const,
          invited_at: null,
          joined_at: business.created_at, // better than null
          invited_by: null,
          joined_via_invite: false,
          email: ownerProfile.email,
          name: ownerProfile.full_name
        },
        ...(businessPermissions ?? [])
          .filter((p) => p.user_id !== ownerProfile.id)
          .map((permission: any) => {
            const profile = workerProfiles.find(p => p.id === permission.user_id);
            return {
              id: `worker-${permission.user_id}`,
              business_id: business.id,
              user_id: permission.user_id,
              role: 'worker' as const,
              invited_at: null,
              joined_at: permission.granted_at,
              invited_by: permission.granted_by,
              joined_via_invite: true,
              email: profile?.email ?? '',
              name: profile?.full_name ?? ''
            };
          })
      ];

      console.log('[business-members] Fetched', members.length, 'members (1 owner +', workerUserIds.length, 'workers)');
      return ok({ data: members, count: members.length });
    }

    if (req.method === 'DELETE') {
      let body: any;
      try {
        body = await req.json();
        if (!body) throw new Error('Request body is empty');
      } catch (jsonError) {
        console.error('[business-members] JSON parsing error:', jsonError);
        return ok({ error: 'Invalid JSON in request body' }, 400);
      }

      // Parse input: accept either memberId="worker-<uuid>" or userId
      const { memberId, userId: bodyUserId } = body as { memberId?: string; userId?: string };
      let targetUserId: string | null = null;

      if (bodyUserId) {
        targetUserId = bodyUserId;
      } else if (memberId && memberId.startsWith('worker-')) {
        targetUserId = memberId.slice('worker-'.length);
      } else {
        return ok({ error: 'Provide memberId="worker-<uuid>" or userId' }, 400);
      }

      if (!targetUserId) return ok({ error: 'Target userId not resolved' }, 400);

      console.log('[business-members] Starting member removal:', { memberId, targetUserId });

      // Verify ownership
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', ctx.businessId)
        .single();

      if (businessError || !business) {
        console.error('[business-members] Error fetching business:', businessError);
        return ok({ error: 'Business not found' }, 404);
      }

      if (business.owner_id !== ctx.userId) {
        return ok({ error: 'Only business owners can remove members' }, 403);
      }

      // Prevent removing the business owner explicitly (defense-in-depth)
      if (business.owner_id === targetUserId) {
        return ok({ error: 'Cannot remove business owner' }, 400);
      }

      // Ensure the target is actually a member; if not, 404
      const { data: membershipRow, error: membershipErr } = await supabase
        .from('business_permissions')
        .select('user_id')
        .eq('business_id', ctx.businessId)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (membershipErr) {
        console.error('[business-members] membership lookup failed:', membershipErr);
        return ok({ error: 'Failed to verify membership' }, 500);
      }
      if (!membershipRow) {
        return ok({ error: 'Member not found' }, 404);
      }

      // Remove permission
      const { error: deleteError } = await supabase
        .from('business_permissions')
        .delete()
        .eq('business_id', ctx.businessId)
        .eq('user_id', targetUserId);

      if (deleteError) {
        console.error('[business-members] Error removing business permission:', deleteError);
        return ok({ error: 'Failed to remove member' }, 500);
      }

      // Optional cleanups (best-effort; ignore missing tables)
      const softTry = async <T>(p: Promise<T>) => {
        try { return await p; } catch (e: any) {
          // Ignore "relation does not exist" or similar
          const msg = String(e?.message || e);
          if (!/relation .* does not exist/i.test(msg)) console.warn('[cleanup]', msg);
          return null;
        }
      };

      // Get target profile for audit logging
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', targetUserId)
        .maybeSingle();

      // Clean up pending invites by email if profile exists
      if (targetProfile?.email) {
        await softTry(
          (async () => {
            const { error } = await supabase.from('invites')
              .delete()
              .eq('business_id', ctx.businessId)
              .eq('invited_user_id', targetUserId)
              .is('redeemed_at', null);
            return { error };
          })()
        );
      }

      // Unassign from job assignments
      await softTry(
        (async () => {
          const { error } = await supabase.from('job_assignments')
            .delete()
            .eq('user_id', targetUserId);
          return { error };
        })()
      );

      // Optional: append audit event
      await softTry(
        (async () => {
          const { error } = await supabase.from('audit_logs').insert({
            business_id: ctx.businessId,
            user_id: ctx.userId,
            action: 'member.removed',
            resource_type: 'business_member',
            resource_id: targetUserId,
            details: { 
              memberId: memberId ?? `worker-${targetUserId}`, 
              email: targetProfile?.email || null, 
              name: targetProfile?.full_name || null 
            }
          });
          return { error };
        })()
      );

      console.log('[business-members] Member removed successfully:', targetUserId);
      return ok({
        message: 'Member removed successfully',
        data: { userId: targetUserId, memberId: memberId ?? `worker-${targetUserId}` }
      });
    }

    return ok({ error: 'Method not allowed' }, 405);

  } catch (error: any) {
    console.error('[business-members] Error:', error);
    return ok({ error: error.message || 'Failed to process request' }, 500);
  }
});
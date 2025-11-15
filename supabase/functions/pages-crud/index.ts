import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;
    const url = new URL(req.url);
    const pageId = url.searchParams.get('pageId');
    const jobId = url.searchParams.get('jobId');

    // GET: List pages or get single page
    if (req.method === 'GET') {
      if (pageId) {
        const { data: page, error: pageError } = await supabase
          .from('sg_pages')
          .select(`
            *,
            created_by_profile:profiles!sg_pages_created_by_fkey(id, full_name),
            collaborators:sg_page_collaborators(
              user_id,
              last_viewed_at,
              last_edited_at,
              cursor_position,
              is_viewing,
              profile:profiles(id, full_name)
            )
          `)
          .eq('id', pageId)
          .eq('business_id', ctx.businessId)
          .single();

        if (pageError) throw pageError;
        return json({ page });
      } else {
        let query = supabase
          .from('sg_pages')
          .select(`
            *,
            created_by_profile:profiles!sg_pages_created_by_fkey(id, full_name)
          `)
          .eq('business_id', ctx.businessId)
          .eq('is_archived', false)
          .order('position', { ascending: true });

        if (jobId) {
          query = query.eq('job_id', jobId);
        }

        const { data: pages, error: pagesError } = await query;
        if (pagesError) throw pagesError;

        return json({ pages });
      }
    }

    // POST: Create new page
    if (req.method === 'POST') {
      const body = await req.json();
      
      const { data: page, error: createError } = await supabase
        .from('sg_pages')
        .insert({
          business_id: ctx.businessId,
          job_id: body.jobId || null,
          title: body.title || 'Untitled Page',
          content_json: body.contentJson || { type: 'doc', content: [] },
          created_by: ctx.userId,
          icon: body.icon || null,
          parent_page_id: body.parentPageId || null,
          position: body.position || 0,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create initial version
      await supabase.from('sg_page_versions').insert({
        page_id: page.id,
        content_json: page.content_json,
        version_number: 1,
        created_by: ctx.userId,
        change_summary: 'Initial version',
      });

      // Add creator as collaborator
      await supabase.from('sg_page_collaborators').insert({
        page_id: page.id,
        user_id: ctx.userId,
        last_viewed_at: new Date().toISOString(),
        is_viewing: true,
      });

      return json({ page }, { status: 201 });
    }

    // PATCH: Update page
    if (req.method === 'PATCH') {
      if (!pageId) throw new Error('pageId required');

      const body = await req.json();
      
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (body.title !== undefined) updates.title = body.title;
      if (body.icon !== undefined) updates.icon = body.icon;
      if (body.contentJson !== undefined) updates.content_json = body.contentJson;
      if (body.isArchived !== undefined) updates.is_archived = body.isArchived;
      if (body.position !== undefined) updates.position = body.position;

      const { data: page, error: updateError } = await supabase
        .from('sg_pages')
        .update(updates)
        .eq('id', pageId)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create version if content changed significantly
      if (body.contentJson && body.createVersion) {
        const { data: lastVersion } = await supabase
          .from('sg_page_versions')
          .select('version_number')
          .eq('page_id', pageId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single();

        await supabase.from('sg_page_versions').insert({
          page_id: pageId,
          content_json: body.contentJson,
          version_number: (lastVersion?.version_number || 0) + 1,
          created_by: ctx.userId,
          change_summary: body.changeSummary || 'Content updated',
        });
      }

      // Update collaborator record
      await supabase
        .from('sg_page_collaborators')
        .upsert({
          page_id: pageId,
          user_id: ctx.userId,
          last_edited_at: new Date().toISOString(),
        });

      return json({ page });
    }

    // DELETE: Delete page
    if (req.method === 'DELETE') {
      if (!pageId) throw new Error('pageId required');

      const { error: deleteError } = await supabase
        .from('sg_pages')
        .delete()
        .eq('id', pageId)
        .eq('business_id', ctx.businessId);

      if (deleteError) throw deleteError;

      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('[pages-crud] Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
});
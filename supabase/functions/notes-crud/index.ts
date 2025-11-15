import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;
    const url = new URL(req.url);
    const noteId = url.searchParams.get('noteId');
    const jobId = url.searchParams.get('jobId');

    console.log('[notes-crud] Request:', req.method, { noteId, jobId });

    // GET: Fetch notes or a single note
    if (req.method === 'GET') {
      if (noteId) {
        const { data: note, error } = await supabase
          .from('sg_notes')
          .select(`
            *,
            created_by_profile:profiles!created_by(id, full_name),
            collaborators:sg_note_collaborators(
              *,
              profile:profiles(id, full_name)
            )
          `)
          .eq('id', noteId)
          .single();

        if (error) throw error;
        console.log('[notes-crud] Fetched note:', note?.id);
        return json({ note });
      }

      // Fetch all notes for a job
      if (jobId) {
        const { data: notes, error } = await supabase
          .from('sg_notes')
          .select(`
            *,
            created_by_profile:profiles!created_by(id, full_name),
            collaborators:sg_note_collaborators(
              *,
              profile:profiles(id, full_name)
            )
          `)
          .eq('job_id', jobId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        console.log('[notes-crud] Fetched notes:', notes?.length);
        return json({ notes });
      }

      throw new Error('noteId or jobId required');
    }

    // POST: Create a new note
    if (req.method === 'POST') {
      const body = await req.json();
      const { title, content_json, job_id } = body;

      console.log('[notes-crud] Creating note:', { title, job_id });

      // Create the note
      const { data: note, error: noteError } = await supabase
        .from('sg_notes')
        .insert({
          business_id: ctx.businessId,
          job_id,
          title: title || 'Untitled Note',
          content_json: content_json || { type: 'doc', content: [] },
          created_by: ctx.userId,
        })
        .select()
        .single();

      if (noteError) {
        console.error('[notes-crud] Error creating note:', noteError);
        throw noteError;
      }

      // Create initial version
      await supabase.from('sg_note_versions').insert({
        note_id: note.id,
        content_json: note.content_json,
        created_by: ctx.userId,
        version_number: 1,
      });

      // Add creator as collaborator
      await supabase.from('sg_note_collaborators').insert({
        note_id: note.id,
        user_id: ctx.userId,
        is_viewing: true,
        last_viewed_at: new Date().toISOString(),
      });

      console.log('[notes-crud] Note created:', note.id);
      return json({ note });
    }

    // PATCH: Update a note
    if (req.method === 'PATCH') {
      if (!noteId) throw new Error('noteId required');

      const body = await req.json();
      const { title, content_json, createVersion = true } = body;

      console.log('[notes-crud] Updating note:', noteId, { createVersion });

      const updates: any = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (content_json !== undefined) updates.content_json = content_json;

      const { data: note, error: updateError } = await supabase
        .from('sg_notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single();

      if (updateError) {
        console.error('[notes-crud] Error updating note:', updateError);
        throw updateError;
      }

      // Create a new version if requested
      if (createVersion && content_json !== undefined) {
        const { data: latestVersion } = await supabase
          .from('sg_note_versions')
          .select('version_number')
          .eq('note_id', noteId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single();

        await supabase.from('sg_note_versions').insert({
          note_id: noteId,
          content_json,
          created_by: ctx.userId,
          version_number: (latestVersion?.version_number || 0) + 1,
        });
      }

      // Update collaborator activity
      await supabase
        .from('sg_note_collaborators')
        .upsert({
          note_id: noteId,
          user_id: ctx.userId,
          is_viewing: true,
          last_viewed_at: new Date().toISOString(),
        });

      console.log('[notes-crud] Note updated:', note.id);
      return json({ note });
    }

    // DELETE: Delete a note
    if (req.method === 'DELETE') {
      if (!noteId) throw new Error('noteId required');

      console.log('[notes-crud] Deleting note:', noteId);

      const { error } = await supabase
        .from('sg_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error('[notes-crud] Error deleting note:', error);
        throw error;
      }

      console.log('[notes-crud] Note deleted:', noteId);
      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('[notes-crud] Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface Section {
  emoji: string;
  title: string;
  items: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;

    // GET - List all entries or get single entry
    if (method === 'GET') {
      const id = url.searchParams.get('id');
      
      if (id) {
        // Get single entry with nested data
        const { data: entry, error: entryError } = await supabase
          .from('changelog_entries')
          .select('*')
          .eq('id', id)
          .single();

        if (entryError) throw entryError;

        // Get sections with items
        const { data: sections, error: sectionsError } = await supabase
          .from('changelog_sections')
          .select('*')
          .eq('entry_id', id)
          .order('sort_order', { ascending: true });

        if (sectionsError) throw sectionsError;

        // Get items for each section
        const sectionsWithItems = await Promise.all(
          (sections || []).map(async (section) => {
            const { data: items, error: itemsError } = await supabase
              .from('changelog_items')
              .select('*')
              .eq('section_id', section.id)
              .order('sort_order', { ascending: true });

            if (itemsError) throw itemsError;

            return {
              ...section,
              items: items || []
            };
          })
        );

        return new Response(
          JSON.stringify({ ...entry, sections: sectionsWithItems }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // List all entries
      const sortBy = url.searchParams.get('sortBy') || 'newest';
      const limit = parseInt(url.searchParams.get('limit') || '50');

      let query = supabase
        .from('changelog_entries')
        .select('*')
        .limit(limit);

      // Apply sorting
      if (sortBy === 'oldest') {
        query = query.order('publish_date', { ascending: true });
      } else {
        query = query.order('publish_date', { ascending: false });
      }

      const { data: entries, error: entriesError } = await query;
      if (entriesError) throw entriesError;

      // Get sections and items for each entry
      const entriesWithData = await Promise.all(
        (entries || []).map(async (entry) => {
          const { data: sections, error: sectionsError } = await supabase
            .from('changelog_sections')
            .select('*')
            .eq('entry_id', entry.id)
            .order('sort_order', { ascending: true });

          if (sectionsError) throw sectionsError;

          const sectionsWithItems = await Promise.all(
            (sections || []).map(async (section) => {
              const { data: items, error: itemsError } = await supabase
                .from('changelog_items')
                .select('*')
                .eq('section_id', section.id)
                .order('sort_order', { ascending: true });

              if (itemsError) throw itemsError;

              return {
                ...section,
                items: items || []
              };
            })
          );

          return {
            ...entry,
            sections: sectionsWithItems
          };
        })
      );

      return new Response(
        JSON.stringify(entriesWithData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Create new entry
    if (method === 'POST') {
      const body = await req.json();
      const { title, description, publish_date, tag, sections } = body;

      // Validate input
      if (!title || title.length > 200) {
        return new Response(
          JSON.stringify({ error: 'Title is required and must be under 200 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!publish_date) {
        return new Response(
          JSON.stringify({ error: 'Publish date is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create entry
      const { data: entry, error: entryError } = await supabase
        .from('changelog_entries')
        .insert({ title, description, publish_date, tag })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create sections and items
      if (sections && sections.length > 0) {
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          const { data: sectionData, error: sectionError } = await supabase
            .from('changelog_sections')
            .insert({
              entry_id: entry.id,
              emoji: section.emoji,
              title: section.title,
              sort_order: i
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          // Create items
          if (section.items && section.items.length > 0) {
            const itemsToInsert = section.items.map((content: string, itemIdx: number) => ({
              section_id: sectionData.id,
              content,
              sort_order: itemIdx
            }));

            const { error: itemsError } = await supabase
              .from('changelog_items')
              .insert(itemsToInsert);

            if (itemsError) throw itemsError;
          }
        }
      }

      // Fetch complete entry with nested data
      const { data: completeEntry, error: fetchError } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('id', entry.id)
        .single();

      if (fetchError) throw fetchError;

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('changelog_sections')
        .select('*')
        .eq('entry_id', entry.id)
        .order('sort_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      const sectionsWithItems = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: items, error: itemsError } = await supabase
            .from('changelog_items')
            .select('*')
            .eq('section_id', section.id)
            .order('sort_order', { ascending: true });

          if (itemsError) throw itemsError;

          return {
            ...section,
            items: items || []
          };
        })
      );

      return new Response(
        JSON.stringify({ ...completeEntry, sections: sectionsWithItems }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH - Update entry
    if (method === 'PATCH') {
      const body = await req.json();
      const { id, title, description, publish_date, tag, sections } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Entry ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update entry
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (publish_date !== undefined) updates.publish_date = publish_date;
      if (tag !== undefined) updates.tag = tag;

      const { error: updateError } = await supabase
        .from('changelog_entries')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      // If sections provided, recreate them
      if (sections) {
        // Delete existing sections (cascade will delete items)
        const { error: deleteError } = await supabase
          .from('changelog_sections')
          .delete()
          .eq('entry_id', id);

        if (deleteError) throw deleteError;

        // Create new sections
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          const { data: sectionData, error: sectionError } = await supabase
            .from('changelog_sections')
            .insert({
              entry_id: id,
              emoji: section.emoji,
              title: section.title,
              sort_order: i
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          // Create items
          if (section.items && section.items.length > 0) {
            const itemsToInsert = section.items.map((content: string, itemIdx: number) => ({
              section_id: sectionData.id,
              content,
              sort_order: itemIdx
            }));

            const { error: itemsError } = await supabase
              .from('changelog_items')
              .insert(itemsToInsert);

            if (itemsError) throw itemsError;
          }
        }
      }

      // Fetch updated entry
      const { data: updatedEntry, error: fetchError } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('changelog_sections')
        .select('*')
        .eq('entry_id', id)
        .order('sort_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      const sectionsWithItems = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: items, error: itemsError } = await supabase
            .from('changelog_items')
            .select('*')
            .eq('section_id', section.id)
            .order('sort_order', { ascending: true });

          if (itemsError) throw itemsError;

          return {
            ...section,
            items: items || []
          };
        })
      );

      return new Response(
        JSON.stringify({ ...updatedEntry, sections: sectionsWithItems }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Delete entry
    if (method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Entry ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('changelog_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[changelog-crud] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

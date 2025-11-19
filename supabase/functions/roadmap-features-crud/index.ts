import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;

    // GET - List all features or get single feature
    if (method === 'GET') {
      const id = url.searchParams.get('id');
      
      if (id) {
        // Get single feature
        const { data, error } = await supabase
          .from('roadmap_features')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // List all features with optional filters
      const status = url.searchParams.get('status');
      const sortBy = url.searchParams.get('sortBy') || 'newest';

      let query = supabase.from('roadmap_features').select('*');

      // Apply status filter
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply sorting
      switch (sortBy) {
        case 'votes':
          query = query.order('vote_count', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create new feature
    if (method === 'POST') {
      const body = await req.json();
      const { title, description, status = 'under-consideration' } = body;

      // Validate input
      if (!title || title.length > 200) {
        return new Response(
          JSON.stringify({ error: 'Title is required and must be under 200 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!description || description.length > 2000) {
        return new Response(
          JSON.stringify({ error: 'Description is required and must be under 2000 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('roadmap_features')
        .insert({ title, description, status })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH - Update feature
    if (method === 'PATCH') {
      const body = await req.json();
      const { id, title, description, status } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Feature ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updates: any = {};
      if (title !== undefined) {
        if (title.length > 200) {
          return new Response(
            JSON.stringify({ error: 'Title must be under 200 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updates.title = title;
      }
      if (description !== undefined) {
        if (description.length > 2000) {
          return new Response(
            JSON.stringify({ error: 'Description must be under 2000 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updates.description = description;
      }
      if (status !== undefined) updates.status = status;

      const { data, error } = await supabase
        .from('roadmap_features')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete feature
    if (method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Feature ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('roadmap_features')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[roadmap-features-crud] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

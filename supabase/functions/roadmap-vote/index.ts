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

    // GET - Check if user has voted
    if (method === 'GET') {
      const featureId = url.searchParams.get('featureId');
      const voterIdentifier = url.searchParams.get('voterIdentifier');

      if (!featureId || !voterIdentifier) {
        return new Response(
          JSON.stringify({ error: 'featureId and voterIdentifier are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('roadmap_votes')
        .select('id')
        .eq('feature_id', featureId)
        .eq('voter_identifier', voterIdentifier)
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify({ hasVoted: !!data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Vote for a feature
    if (method === 'POST') {
      const body = await req.json();
      const { featureId, voterIdentifier } = body;

      if (!featureId || !voterIdentifier) {
        return new Response(
          JSON.stringify({ error: 'featureId and voterIdentifier are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already voted
      const { data: existingVote } = await supabase
        .from('roadmap_votes')
        .select('id')
        .eq('feature_id', featureId)
        .eq('voter_identifier', voterIdentifier)
        .maybeSingle();

      if (existingVote) {
        return new Response(
          JSON.stringify({ error: 'Already voted for this feature' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify feature exists before allowing vote
      const { data: featureExists, error: checkError } = await supabase
        .from('roadmap_features')
        .select('id')
        .eq('id', featureId)
        .single();

      if (checkError || !featureExists) {
        return new Response(
          JSON.stringify({ error: 'Feature not found. Please refresh the page and try again.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert vote
      const { error: insertError } = await supabase
        .from('roadmap_votes')
        .insert({ feature_id: featureId, voter_identifier: voterIdentifier });

      if (insertError) throw insertError;

      // Get updated vote count
      const { data: feature, error: featureError } = await supabase
        .from('roadmap_features')
        .select('vote_count')
        .eq('id', featureId)
        .single();

      if (featureError) throw featureError;

      return new Response(
        JSON.stringify({ success: true, voteCount: feature.vote_count }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Remove vote
    if (method === 'DELETE') {
      const body = await req.json();
      const { featureId, voterIdentifier } = body;

      if (!featureId || !voterIdentifier) {
        return new Response(
          JSON.stringify({ error: 'featureId and voterIdentifier are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('roadmap_votes')
        .delete()
        .eq('feature_id', featureId)
        .eq('voter_identifier', voterIdentifier);

      if (deleteError) throw deleteError;

      // Get updated vote count
      const { data: feature, error: featureError } = await supabase
        .from('roadmap_features')
        .select('vote_count')
        .eq('id', featureId)
        .single();

      if (featureError) throw featureError;

      return new Response(
        JSON.stringify({ success: true, voteCount: feature.vote_count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[roadmap-vote] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

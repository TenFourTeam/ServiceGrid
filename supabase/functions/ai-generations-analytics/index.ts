import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { requireCtx } from '../_lib/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    // GET /ai-generations-analytics/stats - Aggregate statistics
    if (lastPart === 'stats') {
      const { startDate, endDate, generationType } = Object.fromEntries(url.searchParams);

      let query = supabaseAdmin
        .from('sg_ai_generations')
        .select('*', { count: 'exact' })
        .eq('business_id', ctx.businessId);

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);
      if (generationType) query = query.eq('generation_type', generationType);

      const { data: generations, count, error } = await query;

      if (error) {
        console.error('[ai-generations-analytics] Error fetching generations:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Calculate statistics
      const total = count || 0;
      const successful = generations?.filter(g => g.output_data).length || 0;
      const failed = total - successful;
      
      const confidenceCounts = {
        high: generations?.filter(g => g.confidence === 'high').length || 0,
        medium: generations?.filter(g => g.confidence === 'medium').length || 0,
        low: generations?.filter(g => g.confidence === 'low').length || 0,
      };

      const averageLatency = generations?.reduce((sum, g) => {
        return sum + (g.metadata?.latencyMs || 0);
      }, 0) / (total || 1);

      const feedbackStats = {
        totalWithFeedback: generations?.filter(g => g.feedback_rating).length || 0,
        averageRating: generations?.reduce((sum, g) => sum + (g.feedback_rating || 0), 0) / 
                       (generations?.filter(g => g.feedback_rating).length || 1),
        edited: generations?.filter(g => g.was_edited).length || 0,
      };

      // Group by type
      const byType = {
        invoice_estimate: generations?.filter(g => g.generation_type === 'invoice_estimate').length || 0,
        checklist_generation: generations?.filter(g => g.generation_type === 'checklist_generation').length || 0,
      };

      // Estimate credits (rough approximation: 1 generation = 1 credit)
      const estimatedCredits = total;

      const stats = {
        total,
        successful,
        failed,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        confidenceCounts,
        averageLatency,
        feedbackStats,
        byType,
        estimatedCredits,
      };

      return new Response(JSON.stringify({ stats }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /ai-generations-analytics/:id - Single generation details
    if (req.method === 'GET' && lastPart !== 'ai-generations-analytics') {
      const generationId = lastPart;

      const { data: generation, error } = await supabaseAdmin
        .from('sg_ai_generations')
        .select('*, sg_media(*)')
        .eq('id', generationId)
        .eq('business_id', ctx.businessId)
        .single();

      if (error) {
        console.error('[ai-generations-analytics] Error fetching generation:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ generation }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /ai-generations-analytics - List generations with pagination & filters
    if (req.method === 'GET') {
      const { 
        page = '1', 
        limit = '20', 
        generationType, 
        userId, 
        confidence,
        startDate,
        endDate 
      } = Object.fromEntries(url.searchParams);

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      let query = supabaseAdmin
        .from('sg_ai_generations')
        .select('*, sg_media(file_type, public_url, thumbnail_url)', { count: 'exact' })
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (generationType) query = query.eq('generation_type', generationType);
      if (userId) query = query.eq('user_id', userId);
      if (confidence) query = query.eq('confidence', confidence);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data: generations, count, error } = await query;

      if (error) {
        console.error('[ai-generations-analytics] Error fetching generations:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        generations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /ai-generations-analytics/:id - Update feedback
    if (req.method === 'PATCH') {
      const generationId = lastPart;
      const { feedback_rating, feedback_text, was_edited, final_version } = await req.json();

      const { data: generation, error } = await supabaseAdmin
        .from('sg_ai_generations')
        .update({
          feedback_rating,
          feedback_text,
          was_edited,
          final_version,
        })
        .eq('id', generationId)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) {
        console.error('[ai-generations-analytics] Error updating feedback:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ generation }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ai-generations-analytics] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireCtx, json, corsHeaders } from '../_lib/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId } = ctx;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');
    const requestId = url.searchParams.get('requestId');
    const action = url.searchParams.get('action');

    // GET request-assessment-job
    if (req.method === 'GET' && action === 'request-job') {
      if (!requestId) {
        return json({ error: 'Request ID required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('jobs')
        .select('id, status, is_assessment, starts_at, ends_at')
        .eq('request_id', requestId)
        .eq('business_id', businessId)
        .eq('is_assessment', true)
        .maybeSingle();

      if (error) {
        console.error('[assessment-progress] Error:', error);
        return json(null);
      }

      return json(data);
    }

    // GET assessment progress
    if (req.method === 'GET') {
      if (!jobId) {
        return json({
          checklistProgress: 0,
          totalChecklistItems: 0,
          completedChecklistItems: 0,
          photoCount: 0,
          beforePhotoCount: 0,
          risksFound: 0,
          opportunitiesFound: 0,
          hasReport: false,
        });
      }

      // Verify job belongs to business
      const { data: job } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', jobId)
        .eq('business_id', businessId)
        .single();

      if (!job) {
        return json({ error: 'Job not found' }, { status: 404 });
      }

      // Fetch checklist progress
      const { data: checklists } = await supabase
        .from('sg_checklists')
        .select('id')
        .eq('job_id', jobId);

      let totalItems = 0;
      let completedItems = 0;

      if (checklists && checklists.length > 0) {
        const checklistIds = checklists.map(c => c.id);
        
        const { data: items } = await supabase
          .from('sg_checklist_items')
          .select('id, is_completed')
          .in('checklist_id', checklistIds);

        if (items) {
          totalItems = items.length;
          completedItems = items.filter(i => i.is_completed).length;
        }
      }

      // Fetch media with tags
      const { data: media } = await supabase
        .from('sg_media')
        .select('id, tags')
        .eq('job_id', jobId)
        .eq('file_type', 'photo');

      const photoCount = media?.length || 0;
      let beforePhotoCount = 0;
      let risksFound = 0;
      let opportunitiesFound = 0;

      if (media) {
        media.forEach(m => {
          const tags = m.tags as string[] | null;
          if (tags) {
            if (tags.some(t => t === 'assessment:before')) {
              beforePhotoCount++;
            }
            risksFound += tags.filter(t => t.startsWith('risk:')).length;
            opportunitiesFound += tags.filter(t => t.startsWith('opportunity:')).length;
          }
        });
      }

      // Check for AI summary/report
      let hasReport = false;
      const { data: artifacts } = await supabase
        .from('sg_ai_artifacts')
        .select('id, metadata')
        .eq('artifact_type', 'summary')
        .limit(100);
      
      if (artifacts) {
        hasReport = artifacts.some(a => {
          const meta = a.metadata as Record<string, unknown> | null;
          return meta?.job_id === jobId;
        });
      }

      const checklistProgress = totalItems > 0 
        ? Math.round((completedItems / totalItems) * 100) 
        : 0;

      return json({
        checklistProgress,
        totalChecklistItems: totalItems,
        completedChecklistItems: completedItems,
        photoCount,
        beforePhotoCount,
        risksFound,
        opportunitiesFound,
        hasReport,
      });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('[assessment-progress] Error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
});

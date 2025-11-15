import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const jobId = url.searchParams.get('jobId');
      const tags = url.searchParams.get('tags');
      
      if (!jobId) {
        return json({ error: 'jobId is required' }, { status: 400 });
      }

      // Verify job belongs to user's business
      const { data: job, error: jobError } = await ctx.supaAdmin
        .from('jobs')
        .select('id, business_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        console.error('[job-media-crud] Job not found:', jobError);
        return json({ error: 'Job not found' }, { status: 404 });
      }

      if (job.business_id !== ctx.businessId) {
        console.error('[job-media-crud] Access denied: job business_id does not match user business_id');
        return json({ error: 'Access denied' }, { status: 403 });
      }

      // Build query with optional tag filtering
      let query = ctx.supaAdmin
        .from('sg_media')
        .select('*')
        .eq('job_id', jobId);

      if (tags) {
        const tagArray = tags.split(',').map(t => t.trim());
        query = query.overlaps('tags', tagArray);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[job-media-crud] Error fetching media:', error);
        throw error;
      }

      console.log(`[job-media-crud] Successfully fetched ${data?.length || 0} media items for job ${jobId}`);
      return json({ media: data || [] });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('[job-media-crud] Error:', error);
    return json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});

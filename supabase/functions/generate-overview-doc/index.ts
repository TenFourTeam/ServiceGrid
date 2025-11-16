import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.info('[generate-overview-doc] Starting overview generation');
    const ctx = await requireCtx(req);
    const { scope } = await req.json();

    if (!scope) {
      return json({ error: 'Scope is required' }, { status: 400, headers: corsHeaders });
    }

    // Validate scope
    if (scope.dateRange && (!scope.dateRange.start || !scope.dateRange.end)) {
      return json({ error: 'Date range must have start and end' }, { status: 400, headers: corsHeaders });
    }

    console.info('[generate-overview-doc] Fetching jobs with scope:', scope);

    // Build jobs query with filters
    let jobsQuery = ctx.supaAdmin
      .from('jobs')
      .select(`
        id, title, status, notes, address,
        starts_at, ends_at, created_at, estimated_duration_minutes,
        customers!inner(id, name, address),
        job_assignments(user_id, profiles(full_name))
      `)
      .eq('business_id', ctx.businessId);

    // Apply filters
    if (scope.dateRange) {
      jobsQuery = jobsQuery
        .gte('starts_at', scope.dateRange.start)
        .lte('starts_at', scope.dateRange.end);
    }

    if (scope.jobIds && scope.jobIds.length > 0) {
      jobsQuery = jobsQuery.in('id', scope.jobIds);
    }

    if (scope.assignees && scope.assignees.length > 0) {
      jobsQuery = jobsQuery.in('job_assignments.user_id', scope.assignees);
    }

    const { data: jobs, error: jobsError } = await jobsQuery.order('starts_at', { ascending: true });

    if (jobsError) {
      console.error('[generate-overview-doc] Error fetching jobs:', jobsError);
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      return json({ error: 'No jobs found for the given scope' }, { status: 404, headers: corsHeaders });
    }

    const jobIds = jobs.map(j => j.id);
    console.info(`[generate-overview-doc] Found ${jobs.length} jobs`);

    // Fetch checklists
    const { data: checklists } = await ctx.supaAdmin
      .from('sg_checklists')
      .select(`
        id, title, job_id,
        sg_checklist_items(id, title, is_completed, completed_at)
      `)
      .in('job_id', jobIds);

    // Fetch audit logs
    const { data: auditLogs } = await ctx.supaAdmin
      .from('audit_logs')
      .select('action, resource_type, created_at, details')
      .eq('business_id', ctx.businessId)
      .in('resource_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(100);

    // Calculate metrics
    const metrics = {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      inProgressJobs: jobs.filter(j => j.status === 'in_progress').length,
      scheduledJobs: jobs.filter(j => j.status === 'scheduled').length,
      checklistTotal: checklists?.length || 0,
      checklistsCompleted: checklists?.filter(c => 
        c.sg_checklist_items?.every(i => i.is_completed)
      ).length || 0,
      dateRange: scope.dateRange,
      teamMembers: [...new Set(
        jobs.flatMap(j => j.job_assignments?.map(a => a.profiles?.full_name)).filter(Boolean)
      )]
    };

    console.info('[generate-overview-doc] Calculated metrics:', metrics);

    // Build AI prompt
    const systemPrompt = `You are a professional project documentation specialist. Generate a comprehensive overview document based on the provided project data. Structure your response using clear sections with titles, content, and bullet points.`;

    const jobsSummary = jobs.map(j => ({
      id: j.id,
      title: j.title,
      status: j.status,
      customer: j.customers?.name,
      address: j.address,
      scheduled: j.starts_at,
      assignees: j.job_assignments?.map(a => a.profiles?.full_name).filter(Boolean) || []
    }));

    const userPrompt = `Generate a detailed project overview for the following scope:

**Metrics**: 
- Total Jobs: ${metrics.totalJobs}
- Completed: ${metrics.completedJobs}
- In Progress: ${metrics.inProgressJobs}
- Scheduled: ${metrics.scheduledJobs}
- Checklists: ${metrics.checklistTotal} (${metrics.checklistsCompleted} completed)
- Team Members: ${metrics.teamMembers.join(', ')}
${scope.dateRange ? `- Date Range: ${scope.dateRange.start} to ${scope.dateRange.end}` : ''}

**Jobs**: ${JSON.stringify(jobsSummary, null, 2)}

**Recent Activity**: ${auditLogs ? auditLogs.slice(0, 20).map(log => 
  `${log.action} on ${log.resource_type} at ${log.created_at}`
).join('\n') : 'No recent activity'}

Create sections for:
1. Executive Summary (2-3 sentences overview)
2. Scope & Timeline (date range, job count, team composition)
3. Key Highlights (completed milestones, notable achievements)
4. Active Work (in-progress jobs, current focus areas)
5. Upcoming Schedule (scheduled jobs, next actions)
6. Appendix (reference IDs for all jobs)`;

    console.info('[generate-overview-doc] Calling Lovable AI');

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_overview_document',
            description: 'Structure the overview document with sections',
            parameters: {
              type: 'object',
              properties: {
                sections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      content: { type: 'string' },
                      bullets: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['title', 'content']
                  }
                }
              },
              required: ['sections']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_overview_document' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-overview-doc] AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429, headers: corsHeaders });
      }
      if (aiResponse.status === 402) {
        return json({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }, { status: 402, headers: corsHeaders });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('[generate-overview-doc] No tool call in AI response');
      throw new Error('Invalid AI response format');
    }

    const sections = JSON.parse(toolCall.function.arguments).sections;
    console.info(`[generate-overview-doc] Generated ${sections.length} sections`);

    // Convert to Markdown
    const markdown = sections.map(s => {
      let md = `## ${s.title}\n\n${s.content}`;
      if (s.bullets && s.bullets.length > 0) {
        md += '\n\n' + s.bullets.map(b => `- ${b}`).join('\n');
      }
      return md;
    }).join('\n\n');

    // Convert to HTML
    const html = sections.map(s => {
      let htmlContent = `<h2>${s.title}</h2><p>${s.content}</p>`;
      if (s.bullets && s.bullets.length > 0) {
        htmlContent += `<ul>${s.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
      }
      return htmlContent;
    }).join('');

    // Generate input hash for reproducibility
    const inputData = JSON.stringify({
      scope,
      jobIds: jobIds.sort(),
      timestamp: new Date().toISOString().split('T')[0] // Date only for daily reproducibility
    });
    
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(inputData));
    const inputHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.info('[generate-overview-doc] Generated input hash:', inputHash);

    // Store in database
    const { data: artifact, error: insertError } = await ctx.supaAdmin
      .from('sg_ai_artifacts')
      .insert({
        business_id: ctx.businessId,
        created_by: ctx.userId,
        artifact_type: 'overview',
        title: scope.dateRange 
          ? `Project Overview: ${scope.dateRange.start} to ${scope.dateRange.end}`
          : `Project Overview: ${new Date().toLocaleDateString()}`,
        content_markdown: markdown,
        content_html: html,
        input_hash: inputHash,
        metadata: { scope, metrics },
        provenance: {
          job_ids: jobIds,
          checklist_ids: checklists?.map(c => c.id) || [],
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-overview-doc] Error storing artifact:', insertError);
      throw insertError;
    }

    console.info('[generate-overview-doc] Successfully stored artifact:', artifact.id);

    return json({
      artifactId: artifact.id,
      markdown,
      html,
      provenance: artifact.provenance,
      inputHash,
      metrics
    });

  } catch (error: any) {
    console.error('[generate-overview-doc] Error:', error);
    return json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});

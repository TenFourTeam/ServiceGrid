import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.info('[generate-summary] Starting summary generation');
    const ctx = await requireCtx(req);
    const { summaryType, scope, tonePreset, redactionSettings } = await req.json();

    if (!summaryType || !['team', 'customer'].includes(summaryType)) {
      return json({ error: 'summaryType must be "team" or "customer"' }, { status: 400, headers: corsHeaders });
    }

    if (!redactionSettings) {
      return json({ error: 'redactionSettings is required' }, { status: 400, headers: corsHeaders });
    }

    console.info('[generate-summary] Type:', summaryType, 'Tone:', tonePreset || summaryType);

    // Build jobs query
    let jobsQuery = ctx.supaAdmin
      .from('jobs')
      .select(`
        id, title, status, notes, address,
        starts_at, ends_at, created_at, total,
        customers!inner(id, name, address),
        job_assignments(user_id, profiles(full_name))
      `)
      .eq('business_id', ctx.businessId);

    if (scope?.dateRange) {
      jobsQuery = jobsQuery
        .gte('starts_at', scope.dateRange.start)
        .lte('starts_at', scope.dateRange.end);
    }

    if (scope?.jobIds && scope.jobIds.length > 0) {
      jobsQuery = jobsQuery.in('id', scope.jobIds);
    }

    const { data: jobs, error: jobsError } = await jobsQuery.order('starts_at', { ascending: true });

    if (jobsError) {
      console.error('[generate-summary] Error fetching jobs:', jobsError);
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      return json({ error: 'No jobs found for the given scope' }, { status: 404, headers: corsHeaders });
    }

    console.info(`[generate-summary] Found ${jobs.length} jobs`);

    // Apply redaction filters
    let filteredJobs = jobs.map(j => {
      const job = { ...j };
      
      // Remove internal notes for customer summaries
      if (summaryType === 'customer' || redactionSettings.excludeInternalComments) {
        if (job.notes) {
          job.notes = job.notes.replace(/\[INTERNAL\].*?(\n|$)/gi, '');
        }
        // Don't show AI metadata to customers
        delete (job as any).ai_suggested;
        delete (job as any).ai_suggestion_accepted;
      }

      // Strip monetary values if requested
      if (redactionSettings.excludeCosts) {
        delete job.total;
      }

      return job;
    });

    // PII check (basic patterns)
    const dataStr = JSON.stringify(filteredJobs);
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN
      /\b\d{16}\b/g,              // Credit card (basic)
      /\b\d{3}-\d{3}-\d{4}\b/g   // Phone numbers (some formats)
    ];

    for (const pattern of piiPatterns) {
      if (pattern.test(dataStr)) {
        console.error('[generate-summary] PII pattern detected in data');
        return json({ error: 'Potential PII detected in source data - cannot proceed' }, { status: 400, headers: corsHeaders });
      }
    }

    // Calculate metrics
    const metrics = {
      totalJobs: filteredJobs.length,
      completedJobs: filteredJobs.filter(j => j.status === 'completed').length,
      inProgressJobs: filteredJobs.filter(j => j.status === 'in_progress').length,
      scheduledJobs: filteredJobs.filter(j => j.status === 'scheduled').length,
    };

    // Build tone-specific prompt
    const toneInstructions = {
      team: 'Direct and actionable. Include blockers, resource needs, and honest status assessment.',
      customer: 'Professional and reassuring. Highlight value delivered, progress made, and clear next steps. Avoid technical jargon.',
      professional: 'Formal business tone with data-driven insights and measured language.',
      casual: 'Friendly and approachable while remaining informative and clear.',
      technical: 'Detailed technical specifics with metrics and technical terminology where appropriate.'
    };

    const tone = tonePreset || summaryType;
    const systemPrompt = `You are creating a ${summaryType} summary. ${toneInstructions[tone] || toneInstructions[summaryType]}.`;

    const jobsSummary = filteredJobs.map(j => ({
      title: j.title,
      status: j.status,
      customer: j.customers?.name,
      scheduled: j.starts_at,
      ...(redactionSettings.excludeCosts ? {} : { total: j.total })
    }));

    const userPrompt = `Generate a ${summaryType} summary for the following project data:

**Metrics**:
- Total Jobs: ${metrics.totalJobs}
- Completed: ${metrics.completedJobs}
- In Progress: ${metrics.inProgressJobs}
- Scheduled: ${metrics.scheduledJobs}

**Jobs Overview**: ${JSON.stringify(jobsSummary, null, 2)}

Provide:
1. A clear summary (200-400 words) that ${summaryType === 'customer' ? 'focuses on value and outcomes' : 'identifies issues and actions'}
2. 3-5 key takeaway points
3. 2-4 recommended next steps`;

    console.info('[generate-summary] Calling Lovable AI');

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
            name: 'create_summary',
            description: 'Create a structured summary document',
            parameters: {
              type: 'object',
              properties: {
                summary: { 
                  type: 'string', 
                  description: 'Main summary text (200-400 words)' 
                },
                keyPoints: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: '3-5 key takeaways'
                },
                nextSteps: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: '2-4 recommended actions'
                }
              },
              required: ['summary', 'keyPoints']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_summary' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-summary] AI gateway error:', aiResponse.status, errorText);
      
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
      console.error('[generate-summary] No tool call in AI response');
      throw new Error('Invalid AI response format');
    }

    const structuredSummary = JSON.parse(toolCall.function.arguments);
    console.info('[generate-summary] Generated summary with', structuredSummary.keyPoints?.length, 'key points');

    // Convert to Markdown
    const markdown = `${structuredSummary.summary}

## Key Points

${structuredSummary.keyPoints.map((p: string) => `- ${p}`).join('\n')}

${structuredSummary.nextSteps ? `## Next Steps

${structuredSummary.nextSteps.map((s: string) => `- ${s}`).join('\n')}` : ''}`;

    // Convert to HTML
    const html = `<p>${structuredSummary.summary}</p>
<h2>Key Points</h2>
<ul>${structuredSummary.keyPoints.map((p: string) => `<li>${p}</li>`).join('')}</ul>
${structuredSummary.nextSteps ? `<h2>Next Steps</h2>
<ul>${structuredSummary.nextSteps.map((s: string) => `<li>${s}</li>`).join('')}</ul>` : ''}`;

    // Generate input hash
    const inputData = JSON.stringify({
      summaryType,
      scope,
      jobIds: jobs.map(j => j.id).sort(),
      timestamp: new Date().toISOString().split('T')[0]
    });
    
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(inputData));
    const inputHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Store in database
    const { data: artifact, error: insertError } = await ctx.supaAdmin
      .from('sg_ai_artifacts')
      .insert({
        business_id: ctx.businessId,
        created_by: ctx.userId,
        artifact_type: summaryType === 'team' ? 'team_summary' : 'customer_summary',
        title: `${summaryType === 'team' ? 'Team' : 'Customer'} Summary: ${new Date().toLocaleDateString()}`,
        content_markdown: markdown,
        content_html: html,
        input_hash: inputHash,
        metadata: {
          summaryType,
          tonePreset: tone,
          redactionSettings,
          keyPoints: structuredSummary.keyPoints,
          nextSteps: structuredSummary.nextSteps
        },
        provenance: {
          job_ids: jobs.map(j => j.id),
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-summary] Error storing artifact:', insertError);
      throw insertError;
    }

    console.info('[generate-summary] Successfully stored artifact:', artifact.id);

    return json({
      artifactId: artifact.id,
      markdown,
      html,
      summary: structuredSummary.summary,
      keyPoints: structuredSummary.keyPoints,
      nextSteps: structuredSummary.nextSteps,
      provenance: artifact.provenance,
      inputHash
    });

  } catch (error: any) {
    console.error('[generate-summary] Error:', error);
    return json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});

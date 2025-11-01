import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface PredictSchedulingRequest {
  businessId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessId }: PredictSchedulingRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get historical data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', ninetyDaysAgo.toISOString());

    if (jobsError) throw jobsError;

    if (!jobs || jobs.length < 10) {
      // Not enough data for predictions
      return new Response(JSON.stringify({
        insufficient_data: true,
        message: 'Need at least 10 jobs in the last 90 days for predictions'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze patterns
    const dayOfWeekCounts = new Array(7).fill(0);
    const hourOfDayCounts = new Array(24).fill(0);
    const serviceTypeCounts = new Map<string, number>();

    jobs.forEach(job => {
      if (job.starts_at) {
        const date = new Date(job.starts_at);
        dayOfWeekCounts[date.getDay()]++;
        hourOfDayCounts[date.getHours()]++;
      }

      const serviceType = job.job_type || 'unknown';
      serviceTypeCounts.set(serviceType, (serviceTypeCounts.get(serviceType) || 0) + 1);
    });

    const patterns = {
      dayOfWeek: dayOfWeekCounts,
      hourOfDay: hourOfDayCounts,
      serviceTypes: Array.from(serviceTypeCounts.entries()).map(([type, count]) => ({ type, count })),
      totalJobs: jobs.length,
      averageJobsPerDay: jobs.length / 90,
    };

    // Call OpenAI for predictions
    const prompt = `Analyze this service business scheduling data and provide predictions for the next 30 days.

Historical patterns (last 90 days):
- Total jobs: ${patterns.totalJobs}
- Average jobs per day: ${patterns.averageJobsPerDay.toFixed(2)}
- Jobs by day of week: ${JSON.stringify(patterns.dayOfWeek)}
- Jobs by hour: ${JSON.stringify(patterns.hourOfDay)}
- Service types: ${JSON.stringify(patterns.serviceTypes)}

Provide:
1. Daily job predictions for next 30 days (just the numbers)
2. High-risk days where overbooking is likely (dates and reasons)
3. Staffing recommendations (specific actions)
4. Route optimization opportunities (if patterns show clustering)

Format your response as JSON with these keys:
{
  "dailyPredictions": [{ "date": "YYYY-MM-DD", "expectedJobs": number }],
  "highRiskDays": [{ "date": "YYYY-MM-DD", "reason": "string" }],
  "staffingRecommendations": ["recommendation1", "recommendation2"],
  "routeOpportunities": ["opportunity1", "opportunity2"]
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a scheduling analytics expert. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const predictions = JSON.parse(openaiData.choices[0].message.content);

    return new Response(JSON.stringify({
      patterns,
      predictions,
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in predict-scheduling:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

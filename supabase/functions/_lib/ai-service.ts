import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface AIVisionRequest {
  systemPrompt: string;
  userPrompt: string;
  imageUrl: string;
  tools?: any[];
  model?: string;
  enableCache?: boolean; // Check cache before calling AI
  cacheKey?: string; // Optional custom cache key
}

export interface AIVisionResponse {
  success: boolean;
  data?: any;
  error?: {
    type: 'RATE_LIMIT' | 'PAYMENT_REQUIRED' | 'API_ERROR' | 'PARSE_ERROR';
    message: string;
    status?: number;
  };
  metadata?: {
    model: string;
    tokensUsed?: number;
    latencyMs: number;
  };
}

export interface AIGenerationLog {
  businessId: string;
  userId: string;
  generationType: 'invoice_estimate' | 'checklist_generation';
  sourceMediaId: string;
  jobId?: string;
  inputParams: Record<string, any>;
  outputData: Record<string, any>;
  confidence?: 'high' | 'medium' | 'low';
  metadata: Record<string, any>;
}

/**
 * Shared AI service for calling Lovable AI API with vision capabilities
 * Handles rate limiting, error formatting, audit logging, and result caching
 */
export async function callAIWithVision(
  request: AIVisionRequest,
  supabase: SupabaseClient,
  log?: AIGenerationLog
): Promise<AIVisionResponse> {
  const startTime = Date.now();
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // Check cache if enabled
  if (request.enableCache && log) {
    const cacheKey = request.cacheKey || `${log.sourceMediaId}_${log.generationType}`;
    const { data: cachedResult } = await supabase
      .from('sg_ai_generations')
      .select('output_data, metadata, confidence, created_at')
      .eq('source_media_id', log.sourceMediaId)
      .eq('generation_type', log.generationType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Return cached result if less than 24 hours old
    if (cachedResult && cachedResult.output_data) {
      const cacheAge = Date.now() - new Date(cachedResult.created_at).getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) { // 24 hours
        console.log('[AI Service] Returning cached result for', cacheKey);
        return {
          success: true,
          data: cachedResult.output_data,
          metadata: {
            ...cachedResult.metadata,
            cached: true,
            cacheAge: Math.floor(cacheAge / 1000), // seconds
          }
        };
      }
    }
  }
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    return {
      success: false,
      error: {
        type: 'API_ERROR',
        message: 'LOVABLE_API_KEY not configured',
        status: 500
      }
    };
  }

  // Exponential backoff retry logic
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI Service] Attempt ${attempt}/${maxRetries}`);
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: request.systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: request.userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: request.imageUrl
                }
              }
            ]
          }
        ],
        tools: request.tools,
        tool_choice: request.tools ? 'required' : undefined
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI Service] API error:', aiResponse.status, errorText);

      // Handle specific error types
      if (aiResponse.status === 429) {
        // Rate limit - retry with exponential backoff
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`[AI Service] Rate limited. Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        return {
          success: false,
          error: {
            type: 'RATE_LIMIT',
            message: 'AI is experiencing high demand. Please try again in a moment.',
            status: 429
          },
          metadata: {
            model: request.model || 'google/gemini-2.5-flash',
            latencyMs,
            attempts: attempt
          }
        };
      }

      if (aiResponse.status === 402) {
        return {
          success: false,
          error: {
            type: 'PAYMENT_REQUIRED',
            message: 'AI credits exhausted. Please add credits to continue.',
            status: 402
          },
          metadata: {
            model: request.model || 'google/gemini-2.5-flash',
            latencyMs
          }
        };
      }

      // Retry transient errors
      if (aiResponse.status >= 500 && attempt < maxRetries) {
        const backoffMs = Math.min(500 * Math.pow(2, attempt), 5000);
        console.log(`[AI Service] Server error. Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      return {
        success: false,
        error: {
          type: 'API_ERROR',
          message: `AI API error: ${errorText}`,
          status: aiResponse.status
        },
        metadata: {
          model: request.model || 'google/gemini-2.5-flash',
          latencyMs,
          attempts: attempt
        }
      };
    }

    const result = await aiResponse.json();

    // Parse tool calls if present
    let parsedData: any = null;
    if (request.tools && result.choices?.[0]?.message?.tool_calls?.[0]) {
      try {
        const toolCall = result.choices[0].message.tool_calls[0];
        parsedData = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error('[AI Service] Failed to parse tool call:', parseError);
        return {
          success: false,
          error: {
            type: 'PARSE_ERROR',
            message: 'Failed to parse AI response'
          },
          metadata: {
            model: request.model || 'google/gemini-2.5-flash',
            latencyMs
          }
        };
      }
    } else if (!request.tools) {
      // For non-tool calls, return the message content
      parsedData = result.choices?.[0]?.message?.content;
    }

    const metadata = {
      model: request.model || 'google/gemini-2.5-flash',
      tokensUsed: result.usage?.total_tokens,
      latencyMs,
      attempts: attempt,
      cached: false
    };

    // Log to sg_ai_generations if log data provided
    if (log && parsedData) {
      try {
        await supabase
          .from('sg_ai_generations')
          .insert({
            business_id: log.businessId,
            user_id: log.userId,
            generation_type: log.generationType,
            source_media_id: log.sourceMediaId,
            job_id: log.jobId,
            input_params: log.inputParams,
            output_data: parsedData,
            confidence: log.confidence,
            metadata: {
              ...log.metadata,
              ...metadata
            }
          });
        console.log('[AI Service] Logged generation to audit trail');
      } catch (logError) {
        console.error('[AI Service] Failed to log generation:', logError);
        // Don't fail the request if logging fails
      }
    }

    return {
      success: true,
      data: parsedData,
      metadata
    };

  } catch (error) {
    lastError = error;
    
    // Retry on network errors
    if (attempt < maxRetries) {
      const backoffMs = Math.min(500 * Math.pow(2, attempt), 5000);
      console.log(`[AI Service] Network error. Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      continue;
    }
  }
}

  // All retries failed
  const latencyMs = Date.now() - startTime;
  console.error('[AI Service] All retry attempts failed:', lastError);
  return {
    success: false,
    error: {
      type: 'API_ERROR',
      message: lastError instanceof Error ? lastError.message : 'Unknown error after retries',
      status: 500
    },
    metadata: {
      model: request.model || 'google/gemini-2.5-flash',
      latencyMs,
      attempts: maxRetries
    }
  };
}

/**
 * Determine confidence level based on AI response
 */
export function calculateConfidence(data: any, type: 'invoice_estimate' | 'checklist_generation'): 'high' | 'medium' | 'low' {
  if (type === 'invoice_estimate') {
    const services = data?.services || [];
    const hasNotes = !!data?.notes;
    const hasDescription = !!data?.workDescription;
    
    if (services.length >= 3 && hasNotes && hasDescription) return 'high';
    if (services.length >= 1 && (hasNotes || hasDescription)) return 'medium';
    return 'low';
  }
  
  if (type === 'checklist_generation') {
    const tasks = data?.tasks || [];
    const hasEstimates = tasks.some((t: any) => t.estimated_duration_minutes > 0);
    const hasDescriptions = tasks.some((t: any) => t.description);
    
    if (tasks.length >= 5 && hasEstimates && hasDescriptions) return 'high';
    if (tasks.length >= 3 && (hasEstimates || hasDescriptions)) return 'medium';
    return 'low';
  }
  
  return 'medium';
}

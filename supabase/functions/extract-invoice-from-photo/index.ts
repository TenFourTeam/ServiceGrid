import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { requireCtx, corsHeaders } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { mediaId } = await req.json();

    if (!mediaId) {
      return new Response(
        JSON.stringify({ error: 'mediaId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch media from sg_media
    const { data: media, error: mediaError } = await ctx.supabase
      .from('sg_media')
      .select('public_url, original_filename, business_id')
      .eq('id', mediaId)
      .single();

    if (mediaError || !media) {
      console.error('Media fetch error:', mediaError);
      return new Response(
        JSON.stringify({ error: 'Media not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify business context
    if (media.business_id !== ctx.businessId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI with vision + tool calling
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
          {
            role: 'system',
            content: 'You are an expert at extracting structured invoice data from receipt and invoice images. Extract all line items, prices, tax information, and totals accurately.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all invoice data from this receipt/invoice image. Include vendor, date, line items with quantities and prices, tax rate, and total.'
              },
              {
                type: 'image_url',
                image_url: { url: media.public_url }
              }
            ]
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_invoice',
            description: 'Extract structured invoice data from receipt/invoice image',
            parameters: {
              type: 'object',
              properties: {
                vendor: { type: 'string', description: 'Vendor/supplier name' },
                date: { type: 'string', description: 'Invoice date (YYYY-MM-DD)' },
                invoiceNumber: { type: 'string', description: 'Invoice/receipt number' },
                lineItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      quantity: { type: 'number' },
                      unitPrice: { type: 'number' },
                      total: { type: 'number' }
                    },
                    required: ['description', 'quantity', 'unitPrice', 'total']
                  }
                },
                subtotal: { type: 'number' },
                taxRate: { type: 'number', description: 'Tax rate as decimal (e.g., 0.1 for 10%)' },
                taxAmount: { type: 'number' },
                total: { type: 'number' }
              },
              required: ['lineItems', 'total']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_invoice' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ 
          error: 'No invoice data could be extracted',
          warnings: ['AI could not identify invoice structure in the image']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    
    // Calculate confidence based on completeness
    let confidence: 'high' | 'medium' | 'low' = 'high';
    const warnings: string[] = [];
    
    if (!extracted.vendor) {
      confidence = 'medium';
      warnings.push('Vendor name not detected');
    }
    if (!extracted.date) {
      warnings.push('Invoice date not detected');
    }
    if (!extracted.taxRate) {
      confidence = 'medium';
      warnings.push('Tax rate not detected');
    }
    if (extracted.lineItems.length === 0) {
      confidence = 'low';
      warnings.push('No line items detected');
    }

    // Log extraction activity
    await ctx.supabase.from('ai_activity_log').insert({
      business_id: ctx.businessId,
      user_id: ctx.userId,
      activity_type: 'invoice_extraction',
      description: `Extracted invoice data from ${media.original_filename}`,
      metadata: {
        mediaId,
        confidence,
        lineItemCount: extracted.lineItems?.length || 0
      }
    });

    return new Response(
      JSON.stringify({
        extracted,
        confidence,
        warnings: warnings.length > 0 ? warnings : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-invoice-from-photo:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

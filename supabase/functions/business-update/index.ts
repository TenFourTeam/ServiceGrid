import { corsHeaders, requireCtx, json } from '../_lib/auth.ts';
import { z } from 'https://deno.land/x/zod@v3.20.2/mod.ts';

const BusinessUpdateSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  description: z.string().optional().or(z.literal('')).or(z.null()).transform(val => val === null ? '' : val),
  phone: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  replyToEmail: z.string().email().optional().or(z.literal('')).or(z.null()).transform(val => val === null ? '' : val),
});

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    console.log('[business-update] POST request received');
    
    // Get authenticated context
    const ctx = await requireCtx(req);
    console.log(`[business-update] Context resolved: userId=${ctx.userId}, businessId=${ctx.businessId}`);

    // Parse and validate request body
    let input;
    const body = await req.text();
    console.log('[business-update] Raw request body:', body);
    
    try {
      const parsedBody = JSON.parse(body);
      input = BusinessUpdateSchema.parse(parsedBody);
      console.log('[business-update] Validated input:', { 
        hasBusinessName: !!input.businessName,
        hasDescription: !!input.description,
        hasPhone: !!input.phone, 
        hasReplyToEmail: !!input.replyToEmail 
      });
    } catch (parseError) {
      console.error('[business-update] Parsing/validation failed:', parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      return json({ error: 'Invalid request data', details: errorMessage }, { status: 400 });
    }

    // Update business in database
    const updateData: any = {
      name: input.businessName.trim(),
      name_customized: input.businessName.toLowerCase().trim() !== 'my business',
      updated_at: new Date().toISOString(),
    };

    if (input.description !== undefined) {
      updateData.description = input.description?.trim() || null;
    }

    if (input.phone !== undefined && input.phone !== null) {
      updateData.phone = input.phone.trim() || null;
    }

    if (input.replyToEmail !== undefined) {
      updateData.reply_to_email = input.replyToEmail?.trim() || null;
    }

    console.log('[business-update] Updating business with data:', updateData);
    
    const { data: business, error: updateError } = await ctx.supaAdmin
      .from('businesses')
      .update(updateData)
      .eq('id', ctx.businessId)
      .select('id, name, description, phone, reply_to_email, logo_url, light_logo_url, tax_rate_default, updated_at')
      .single();

    if (updateError) {
      console.error('[business-update] Database update failed:', updateError);
      return json({ error: 'Failed to update business profile' }, { status: 500 });
    }

    console.log('[business-update] Business updated successfully:', business?.id);

    // Trigger rebuild for meta tag updates
    try {
      const deployHookUrl = Deno.env.get('VERCEL_DEPLOY_HOOK');
      if (deployHookUrl) {
        console.log('[business-update] Triggering rebuild via deploy hook...');
        const response = await fetch(deployHookUrl, { method: 'POST' });
        if (response.ok) {
          console.log('[business-update] Rebuild triggered successfully');
        } else {
          console.warn('[business-update] Failed to trigger rebuild:', response.status);
        }
      } else {
        console.log('[business-update] No deploy hook configured, skipping rebuild');
      }
    } catch (rebuildError) {
      console.warn('[business-update] Error triggering rebuild:', rebuildError);
    }

    return json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        description: business.description,
        phone: business.phone,
        replyToEmail: business.reply_to_email,
        logoUrl: business.logo_url,
        lightLogoUrl: business.light_logo_url,
        taxRateDefault: business.tax_rate_default,
        updatedAt: business.updated_at,
      }
    });

  } catch (error) {
    console.error('[business-update] Unexpected error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
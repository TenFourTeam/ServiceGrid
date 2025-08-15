import { corsHeaders, requireCtx, json } from '../_lib/auth.ts';
import { z } from 'https://deno.land/x/zod@v3.20.2/mod.ts';

const BusinessUpdateSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  phone: z.string().optional(),
  replyToEmail: z.string().email().optional().or(z.literal('')),
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
        hasPhone: !!input.phone, 
        hasReplyToEmail: !!input.replyToEmail 
      });
    } catch (parseError) {
      console.error('[business-update] Parsing/validation failed:', parseError);
      return json({ error: 'Invalid request data', details: parseError.message }, { status: 400 });
    }

    // Update business in database
    const updateData: any = {
      name: input.businessName.trim(),
      name_customized: input.businessName.toLowerCase().trim() !== 'my business',
      updated_at: new Date().toISOString(),
    };

    if (input.phone) {
      updateData.phone = input.phone.trim();
    }

    if (input.replyToEmail !== undefined) {
      updateData.reply_to_email = input.replyToEmail.trim() || null;
    }

    console.log('[business-update] Updating business with data:', updateData);
    
    const { data: business, error: updateError } = await ctx.supaAdmin
      .from('businesses')
      .update(updateData)
      .eq('id', ctx.businessId)
      .select('id, name, phone, reply_to_email, logo_url, light_logo_url, tax_rate_default, updated_at')
      .single();

    if (updateError) {
      console.error('[business-update] Database update failed:', updateError);
      return json({ error: 'Failed to update business profile' }, { status: 500 });
    }

    console.log('[business-update] Business updated successfully:', business?.id);

    return json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
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
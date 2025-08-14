import { requireCtx, corsHeaders, json } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId } = ctx;

    if (req.method !== 'PUT') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { name, phone, replyToEmail, taxRateDefault } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return json({ error: 'Business name is required' }, { status: 400 });
    }

    // Update the business
    const { data: business, error } = await ctx.supaAdmin
      .from('businesses')
      .update({
        name: name.trim(),
        phone: phone || null,
        reply_to_email: replyToEmail || null,
        tax_rate_default: taxRateDefault || 0.0,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error updating business:', error);
      return json({ error: 'Failed to update business' }, { status: 500 });
    }

    console.log('Business updated successfully:', business.id);

    return json({ 
      success: true, 
      business: {
        id: business.id,
        name: business.name,
        phone: business.phone,
        replyToEmail: business.reply_to_email,
        taxRateDefault: business.tax_rate_default
      }
    });

  } catch (error) {
    console.error('Update business error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});
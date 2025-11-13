import { corsHeaders, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[checklist-templates-crud] Processing request');
    
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;

    const url = new URL(req.url);
    const method = req.method;
    const templateId = url.pathname.split('/').filter(p => p && p !== 'checklist-templates-crud').pop();

    // GET - List templates or get single
    if (method === 'GET') {
      const businessId = url.searchParams.get('businessId');
      
      if (templateId && templateId !== 'checklist-templates-crud') {
        // Get single template with items
        const { data: template, error } = await supabase
          .from('sg_checklist_templates')
          .select(`
            *,
            items:sg_checklist_template_items(*)
          `)
          .eq('id', templateId)
          .single();
        
        if (error) throw error;
        
        return new Response(JSON.stringify({ template }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (businessId) {
        // List all templates (business + system)
        const { data: templates, error } = await supabase
          .from('sg_checklist_templates')
          .select(`
            *,
            items:sg_checklist_template_items(id)
          `)
          .or(`business_id.eq.${businessId},is_system_template.eq.true`)
          .eq('is_archived', false)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Add item count to each template
        const enriched = templates.map(t => ({
          ...t,
          item_count: t.items?.length || 0
        }));
        
        return new Response(JSON.stringify({ templates: enriched }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('Missing businessId parameter');
    }

    // POST - Create template
    if (method === 'POST') {
      const { businessId, name, description, category, items } = await req.json();
      
      // Create template
      const { data: template, error: templateError } = await supabase
        .from('sg_checklist_templates')
        .insert({
          business_id: businessId,
          name,
          description,
          category,
          created_by: ctx.userId
        })
        .select()
        .single();
      
      if (templateError) throw templateError;
      
      // Create items
      if (items && items.length > 0) {
        const templateItems = items.map((item: any, index: number) => ({
          template_id: template.id,
          title: item.title,
          description: item.description,
          position: item.position ?? index,
          required_photo_count: item.required_photo_count || 0,
          estimated_duration_minutes: item.estimated_duration_minutes,
          category: item.category
        }));
        
        const { error: itemsError } = await supabase
          .from('sg_checklist_template_items')
          .insert(templateItems);
        
        if (itemsError) throw itemsError;
      }
      
      return new Response(JSON.stringify({ template }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Method not allowed');
  } catch (error: any) {
    console.error('[checklist-templates-crud] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('authentication') ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import { corsHeaders, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[checklists-crud] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;

    const url = new URL(req.url);
    const method = req.method;
    const checklistId = url.pathname.split('/').pop();

    // GET - List or fetch single checklist
    if (method === 'GET') {
      const jobId = url.searchParams.get('jobId');
      
      if (checklistId && checklistId !== 'checklists-crud') {
        // Get single checklist with items
        const { data: checklist, error } = await supabase
          .from('sg_checklists')
          .select(`
            *,
            items:sg_checklist_items(*),
            template:sg_checklist_templates(id, name)
          `)
          .eq('id', checklistId)
          .single();
        
        if (error) throw error;
        
        // Calculate progress
        const items = checklist.items || [];
        const completed = items.filter((item: any) => item.is_completed).length;
        const total = items.length;
        
        return new Response(JSON.stringify({ 
          checklist,
          progress: { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (jobId) {
        // Get checklist for specific job
        const { data: checklist, error } = await supabase
          .from('sg_checklists')
          .select(`
            *,
            items:sg_checklist_items(*),
            template:sg_checklist_templates(id, name)
          `)
          .eq('job_id', jobId)
          .maybeSingle();
        
        if (error) throw error;
        
        if (checklist) {
          const items = checklist.items || [];
          const completed = items.filter((item: any) => item.is_completed).length;
          const total = items.length;
          
          return new Response(JSON.stringify({ 
            checklist,
            progress: { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify({ checklist: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('Missing jobId parameter');
    }

    // POST - Create checklist from template or blank
    if (method === 'POST') {
      const { jobId, businessId, templateId, title, assignedTo } = await req.json();
      
      // Create checklist
      const { data: checklist, error: checklistError } = await supabase
        .from('sg_checklists')
        .insert({
          job_id: jobId,
          business_id: businessId,
          template_id: templateId,
          title: title || 'Job Checklist',
          assigned_to: assignedTo,
          created_by: ctx.userId,
        })
        .select()
        .single();
      
      if (checklistError) throw checklistError;
      
      // If template provided, copy template items
      if (templateId) {
        const { data: templateItems, error: itemsError } = await supabase
          .from('sg_checklist_template_items')
          .select('*')
          .eq('template_id', templateId)
          .order('position');
        
        if (itemsError) throw itemsError;
        
        if (templateItems && templateItems.length > 0) {
          const checklistItems = templateItems.map((item: any) => ({
            checklist_id: checklist.id,
            title: item.title,
            description: item.description,
            position: item.position,
            required_photo_count: item.required_photo_count,
            estimated_duration_minutes: item.estimated_duration_minutes,
            category: item.category
          }));
          
          const { error: insertError } = await supabase
            .from('sg_checklist_items')
            .insert(checklistItems);
          
          if (insertError) throw insertError;
        }
      }
      
      // Log creation event
      await supabase.from('sg_checklist_events').insert({
        checklist_id: checklist.id,
        event_type: 'created',
        user_id: ctx.userId,
        metadata: { template_id: templateId }
      });
      
      console.log('[checklists-crud] Created checklist:', checklist.id);
      return new Response(JSON.stringify({ checklist }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update checklist metadata
    if (method === 'PUT') {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('sg_checklists')
        .update(body)
        .eq('id', checklistId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('[checklists-crud] Updated checklist:', data.id);
      return new Response(JSON.stringify({ checklist: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete checklist
    if (method === 'DELETE') {
      const { error } = await supabase
        .from('sg_checklists')
        .delete()
        .eq('id', checklistId);
      
      if (error) throw error;
      
      console.log('[checklists-crud] Deleted checklist:', checklistId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[checklists-crud] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('authentication') ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
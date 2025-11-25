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
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract checklistId correctly based on path structure
    // Paths: /checklists-crud/:checklistId or /checklists-crud/:checklistId/action
    let checklistId = null;
    if (pathParts.length >= 2 && pathParts[0] === 'checklists-crud') {
      // Get the second segment if it's not 'items' and looks like a UUID
      const secondSegment = pathParts[1];
      if (secondSegment && secondSegment !== 'items' && secondSegment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        checklistId = secondSegment;
      }
    }
    
    console.log('[checklists-crud] Path:', url.pathname);
    console.log('[checklists-crud] PathParts:', pathParts);
    console.log('[checklists-crud] Extracted checklistId:', checklistId);

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

    // POST - Create checklist from template or blank OR Add item to existing checklist
    if (method === 'POST') {
      // Add item to checklist: POST /checklists-crud/:checklistId/items
      if (pathParts.includes('items')) {
        if (!checklistId) {
          throw new Error('Checklist ID is required to add items');
        }
        
        const { title, description, category, required_photo_count } = await req.json();
        
        if (!title) {
          throw new Error('Task title is required');
        }
        
        // Get current max position
        const { data: existingItems } = await supabase
          .from('sg_checklist_items')
          .select('position')
          .eq('checklist_id', checklistId)
          .order('position', { ascending: false })
          .limit(1);
        
        const nextPosition = existingItems && existingItems.length > 0 
          ? existingItems[0].position + 1 
          : 0;
        
        // Insert new item
        const { data: newItem, error: itemError } = await supabase
          .from('sg_checklist_items')
          .insert({
            checklist_id: checklistId,
            title,
            description,
            category,
            required_photo_count: required_photo_count || 0,
            position: nextPosition,
            is_completed: false,
          })
          .select()
          .single();
        
        if (itemError) throw itemError;
        
        // Log event
        await supabase.from('sg_checklist_events').insert({
          checklist_id: checklistId,
          event_type: 'item_added',
          user_id: ctx.userId,
          metadata: { item_id: newItem.id, title }
        });
        
        console.log('[checklists-crud] Added item to checklist:', checklistId);
        return new Response(JSON.stringify({ item: newItem }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Regular checklist creation
      const { jobId, businessId, templateId, title, assignedTo } = await req.json();
      
      if (!jobId) {
        throw new Error('jobId is required to create a checklist');
      }
      
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

    // PATCH - Assign, approve, or reject checklist
    if (method === 'PATCH') {
      // Approve checklist: PATCH /checklists-crud/:checklistId/approve
      if (pathParts.includes('approve') && checklistId && checklistId !== 'checklists-crud') {
        const { error } = await supabase
          .from('sg_checklists')
          .update({
            status: 'active',
            approved_by: ctx.userId,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', checklistId);

        if (error) throw error;

        // Log event
        await supabase.from('sg_checklist_events').insert({
          checklist_id: checklistId,
          event_type: 'approved',
          user_id: ctx.userId,
          metadata: {},
        });

        console.log('[checklists-crud] Approved checklist:', checklistId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Reject checklist: PATCH /checklists-crud/:checklistId/reject
      if (pathParts.includes('reject') && checklistId && checklistId !== 'checklists-crud') {
        const { reason } = await req.json();

        // Delete the checklist
        const { error } = await supabase
          .from('sg_checklists')
          .delete()
          .eq('id', checklistId);

        if (error) throw error;

        // Log event
        await supabase.from('sg_checklist_events').insert({
          checklist_id: checklistId,
          event_type: 'rejected',
          user_id: ctx.userId,
          metadata: { reason: reason || 'No reason provided' },
        });

        console.log('[checklists-crud] Rejected checklist:', checklistId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Assign checklist: PATCH /checklists-crud/:checklistId/assign
      if (pathParts.includes('assign') && checklistId && checklistId !== 'checklists-crud') {
        const { assignedTo } = await req.json();
        
        const { error } = await supabase
          .from('sg_checklists')
          .update({ 
            assigned_to: assignedTo, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', checklistId);
        
        if (error) throw error;
        
        // Log event
        await supabase.from('sg_checklist_events').insert({
          checklist_id: checklistId,
          event_type: 'checklist_assigned',
          user_id: ctx.userId,
          metadata: { assigned_to: assignedTo }
        });
        
        console.log('[checklists-crud] Assigned checklist:', checklistId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Assign item: PATCH /checklists-crud/items/:itemId/assign
      if (pathParts.includes('items')) {
        const itemId = pathParts[pathParts.indexOf('items') + 1];
        const { assignedTo } = await req.json();
        
        const { error } = await supabase
          .from('sg_checklist_items')
          .update({ 
            assigned_to: assignedTo, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', itemId);
        
        if (error) throw error;
        
        // Get checklist_id for event logging
        const { data: item } = await supabase
          .from('sg_checklist_items')
          .select('checklist_id')
          .eq('id', itemId)
          .single();
        
        if (item) {
          await supabase.from('sg_checklist_events').insert({
            checklist_id: item.checklist_id,
            event_type: 'item_assigned',
            user_id: ctx.userId,
            metadata: { item_id: itemId, assigned_to: assignedTo }
          });
        }
        
        console.log('[checklists-crud] Assigned item:', itemId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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
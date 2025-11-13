import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();
    
    if (!profile) throw new Error('Profile not found');

    const { itemId, isCompleted } = await req.json();

    // Fetch item details
    const { data: item, error: itemError } = await supabase
      .from('sg_checklist_items')
      .select('*, checklist:sg_checklists(id, business_id)')
      .eq('id', itemId)
      .single();
    
    if (itemError || !item) throw new Error('Item not found');

    // If completing (not uncompleting), enforce photo requirement
    if (isCompleted && item.required_photo_count > 0) {
      const { count: photoCount } = await supabase
        .from('sg_media')
        .select('id', { count: 'exact', head: true })
        .eq('checklist_item_id', itemId);
      
      if ((photoCount || 0) < item.required_photo_count) {
        // Log failed attempt
        await supabase.from('sg_checklist_events').insert({
          checklist_id: item.checklist.id,
          item_id: itemId,
          event_type: 'photo_required_failed',
          user_id: profile.id,
          metadata: { 
            required: item.required_photo_count,
            current: photoCount || 0
          }
        });
        
        return new Response(JSON.stringify({ 
          success: false,
          error: `This item requires ${item.required_photo_count} photo(s). Current: ${photoCount || 0}`,
          required: item.required_photo_count,
          current: photoCount || 0
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update item completion status
    const { data: updatedItem, error: updateError } = await supabase
      .from('sg_checklist_items')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        completed_by: isCompleted ? profile.id : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();
    
    if (updateError) throw updateError;

    // Log event
    await supabase.from('sg_checklist_events').insert({
      checklist_id: item.checklist.id,
      item_id: itemId,
      event_type: isCompleted ? 'item_completed' : 'item_uncompleted',
      user_id: profile.id,
      metadata: {}
    });

    return new Response(JSON.stringify({ 
      success: true,
      item: updatedItem
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
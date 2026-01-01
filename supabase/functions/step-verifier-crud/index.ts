import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireCtx, json, corsHeaders } from '../_lib/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId, userId } = ctx;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // POST - Execute rollback or log activity
    if (req.method === 'POST') {
      const body = await req.json();

      // Log rollback activity
      if (action === 'log-rollback') {
        const { data, error } = await supabase
          .from('ai_activity_log')
          .insert({
            business_id: businessId,
            user_id: userId,
            activity_type: 'rollback',
            description: body.description,
            accepted: true,
            metadata: body.metadata || {},
          })
          .select()
          .single();

        if (error) throw error;
        return json(data, { status: 201 });
      }

      // Execute rollback tool
      if (action === 'execute-rollback') {
        const { rollbackTool, rollbackArgs } = body;
        
        let result: { success: boolean; error?: string } = { success: false };

        switch (rollbackTool) {
          case 'delete_customer': {
            const { error } = await supabase
              .from('customers')
              .delete()
              .eq('id', rollbackArgs.customer_id)
              .eq('business_id', businessId);
            if (error) throw new Error(`Failed to delete customer: ${error.message}`);
            result = { success: true };
            break;
          }
          
          case 'delete_request': {
            const { error } = await supabase
              .from('requests')
              .delete()
              .eq('id', rollbackArgs.request_id)
              .eq('business_id', businessId);
            if (error) throw new Error(`Failed to delete request: ${error.message}`);
            result = { success: true };
            break;
          }
          
          case 'delete_quote': {
            const { error } = await supabase
              .from('quotes')
              .delete()
              .eq('id', rollbackArgs.quote_id)
              .eq('business_id', businessId);
            if (error) throw new Error(`Failed to delete quote: ${error.message}`);
            result = { success: true };
            break;
          }
          
          case 'delete_job': {
            const { error } = await supabase
              .from('jobs')
              .delete()
              .eq('id', rollbackArgs.job_id)
              .eq('business_id', businessId);
            if (error) throw new Error(`Failed to delete job: ${error.message}`);
            result = { success: true };
            break;
          }
          
          case 'unassign_job': {
            const { error } = await supabase
              .from('job_assignments')
              .delete()
              .eq('job_id', rollbackArgs.job_id)
              .eq('user_id', rollbackArgs.user_id);
            if (error) throw new Error(`Failed to unassign job: ${error.message}`);
            result = { success: true };
            break;
          }
          
          case 'void_invoice': {
            const { error } = await supabase
              .from('invoices')
              .delete()
              .eq('id', rollbackArgs.invoice_id)
              .eq('business_id', businessId);
            if (error) throw new Error(`Failed to void invoice: ${error.message}`);
            result = { success: true };
            break;
          }
          
          case 'delete_media': {
            const { error } = await supabase
              .from('sg_media')
              .delete()
              .eq('id', rollbackArgs.media_id)
              .eq('business_id', businessId);
            if (error) throw new Error(`Failed to delete media: ${error.message}`);
            result = { success: true };
            break;
          }
          
          case 'remove_media_tags': {
            const { data: media, error: fetchError } = await supabase
              .from('sg_media')
              .select('tags')
              .eq('id', rollbackArgs.media_id)
              .eq('business_id', businessId)
              .single();
            
            if (fetchError) throw new Error(`Failed to fetch media: ${fetchError.message}`);
            
            const currentTags = (media?.tags as string[]) || [];
            const tagsToRemove = rollbackArgs.tags || [];
            const newTags = currentTags.filter((t: string) => !tagsToRemove.includes(t));
            
            const { error } = await supabase
              .from('sg_media')
              .update({ tags: newTags })
              .eq('id', rollbackArgs.media_id)
              .eq('business_id', businessId);
            
            if (error) throw new Error(`Failed to remove media tags: ${error.message}`);
            result = { success: true };
            break;
          }
          
          case 'delete_checklist': {
            const { error } = await supabase
              .from('sg_checklists')
              .delete()
              .eq('id', rollbackArgs.checklist_id)
              .eq('business_id', businessId);
            if (error) throw new Error(`Failed to delete checklist: ${error.message}`);
            result = { success: true };
            break;
          }
          
          default:
            return json({ error: `Unknown rollback tool: ${rollbackTool}` }, { status: 400 });
        }

        // Log the rollback activity
        await supabase
          .from('ai_activity_log')
          .insert({
            business_id: businessId,
            user_id: userId,
            activity_type: 'rollback',
            description: `Rolled back using ${rollbackTool}`,
            accepted: true,
            metadata: {
              rollback_tool: rollbackTool,
              rollback_args: rollbackArgs,
            }
          });

        return json(result);
      }

      // Execute database assertion query
      if (action === 'db-assertion') {
        const { table, select, where } = body;
        
        let query = supabase.from(table).select(select);
        
        for (const [field, value] of Object.entries(where)) {
          if (value !== undefined && value !== null) {
            query = query.eq(field, value);
          }
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return json({ data });
      }

      return json({ error: 'Invalid action' }, { status: 400 });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('[step-verifier-crud] Error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
});

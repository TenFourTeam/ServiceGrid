import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';

/**
 * Hook that listens to real-time automation events from ai_activity_log
 * and surfaces them as toast notifications for immediate user visibility.
 */
export function useLeadAutomationNotifications() {
  const { businessId } = useBusinessContext();

  useEffect(() => {
    if (!businessId) return;

    // Subscribe to new ai_activity_log inserts for automation events
    const channel = supabase
      .channel('lead-automation-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_activity_log',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const activity = payload.new as {
            id: string;
            activity_type: string;
            description: string;
            metadata: Record<string, any> | null;
            created_at: string;
          };

          // Only show notifications for specific automation types
          const actionType = activity.metadata?.action_type;
          
          if (actionType === 'lead_scored') {
            const score = activity.metadata?.score;
            const customerName = activity.metadata?.customer_name || 'Lead';
            toast.success(`⚡ Lead Scored: ${customerName}`, {
              description: score !== undefined ? `Quality score: ${score}/100` : undefined,
              duration: 4000,
            });
          } else if (actionType === 'lead_assigned') {
            const assignedTo = activity.metadata?.assigned_to_name || 'team member';
            const customerName = activity.metadata?.customer_name || 'Request';
            toast.success(`👥 Auto-Assigned: ${customerName}`, {
              description: `Assigned to ${assignedTo}`,
              duration: 4000,
            });
          } else if (actionType === 'email_queued') {
            const emailType = activity.metadata?.email_type || 'Welcome email';
            const delay = activity.metadata?.delay_minutes;
            toast.success(`📧 Email Queued`, {
              description: delay ? `${emailType} scheduled in ${delay} min` : emailType,
              duration: 4000,
            });
          } else if (actionType === 'verification_failed') {
            const toolName = activity.metadata?.tool_name || 'Action';
            const failedAssertion = activity.metadata?.failed_assertion;
            toast.error(`⚠️ Verification Failed: ${toolName}`, {
              description: failedAssertion || 'Check the workflow for details',
              duration: 6000,
            });
          } else if (actionType === 'rollback_executed') {
            const rollbackTool = activity.metadata?.rollback_tool || 'action';
            toast.info(`↩️ Rolled Back: ${rollbackTool.replace(/_/g, ' ')}`, {
              description: 'Previous action was undone to maintain data integrity',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);
}

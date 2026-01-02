import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';

/**
 * Hook that listens to real-time automation events from ai_activity_log
 * for site assessment-related automations and surfaces them as toast notifications.
 */
export function useAssessmentAutomationNotifications() {
  const { businessId } = useBusinessContext();

  useEffect(() => {
    if (!businessId) return;

    // Subscribe to new ai_activity_log inserts for assessment automation events
    const channel = supabase
      .channel('assessment-automation-notifications')
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

          // Only show notifications for assessment-specific automation types
          const actionType = activity.metadata?.action_type;
          
          if (actionType === 'assessment_checklist_created') {
            const itemCount = activity.metadata?.item_count || 0;
            const customerName = activity.metadata?.customer_name || 'Customer';
            toast.success(`📋 Checklist Created`, {
              description: `${itemCount} items auto-created for ${customerName}'s assessment`,
              duration: 4000,
            });
          } else if (actionType === 'assessment_scheduled') {
            const scheduledDate = activity.metadata?.scheduled_date;
            const customerName = activity.metadata?.customer_name || 'Customer';
            toast.success(`📅 Assessment Scheduled`, {
              description: scheduledDate 
                ? `Scheduled for ${new Date(scheduledDate).toLocaleDateString()} - ${customerName}`
                : `Assessment scheduled for ${customerName}`,
              duration: 4000,
            });
          } else if (actionType === 'assessment_photo_uploaded') {
            const photoCount = activity.metadata?.photo_count || 1;
            toast.success(`📸 Photos Uploaded`, {
              description: `${photoCount} photo${photoCount > 1 ? 's' : ''} tagged as "before"`,
              duration: 3000,
            });
          } else if (actionType === 'assessment_risk_detected') {
            const riskType = activity.metadata?.risk_type || 'Issue';
            const severity = activity.metadata?.severity || 'medium';
            toast.warning(`⚠️ Risk Detected: ${riskType}`, {
              description: `Severity: ${severity}. Review in assessment details.`,
              duration: 5000,
            });
          } else if (actionType === 'assessment_report_generated') {
            const customerName = activity.metadata?.customer_name || 'Assessment';
            toast.success(`📄 Report Generated`, {
              description: `${customerName} assessment report is ready`,
              duration: 4000,
            });
          } else if (actionType === 'assessment_request_status_updated') {
            const newStatus = activity.metadata?.new_status || 'Updated';
            toast.info(`🔄 Request Status: ${newStatus}`, {
              description: activity.description,
              duration: 3000,
            });
          } else if (actionType === 'assessment_verification_failed') {
            const toolName = activity.metadata?.tool_name || 'Action';
            const failedAssertion = activity.metadata?.failed_assertion;
            toast.error(`⚠️ Verification Failed: ${toolName}`, {
              description: failedAssertion || 'Check the workflow for details',
              duration: 6000,
            });
          } else if (actionType === 'assessment_rollback_executed') {
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

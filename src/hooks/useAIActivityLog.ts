import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export type AIActivityType = 'suggestion' | 'optimization' | 'prediction' | 'conflict_resolution' | 'auto_schedule';

export interface AIActivity {
  id: string;
  business_id: string;
  user_id: string;
  activity_type: AIActivityType;
  description: string;
  accepted: boolean | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface LogActivityParams {
  activityType: AIActivityType;
  description: string;
  accepted?: boolean | null;
  metadata?: Record<string, any>;
}

/**
 * Hook for tracking and retrieving AI activity logs
 * Provides transparency into AI decisions and user interactions
 */
export function useAIActivityLog() {
  const { businessId, profileId } = useBusinessContext();
  const queryClient = useQueryClient();

  // Get recent activity (last 24 hours)
  const recentActivity = useQuery({
    queryKey: ['ai-activity-log', businessId, 'recent'],
    queryFn: async () => {
      if (!businessId) return [];
      
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('ai_activity_log')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AIActivity[];
    },
    enabled: !!businessId,
  });

  // Get pending suggestions count (not accepted/rejected)
  const pendingSuggestionsCount = useQuery({
    queryKey: ['ai-activity-log', businessId, 'pending-count'],
    queryFn: async () => {
      if (!businessId) return 0;
      
      const { count, error } = await supabase
        .from('ai_activity_log')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .is('accepted', null)
        .in('activity_type', ['suggestion', 'optimization']);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!businessId,
  });

  // Log new activity
  const logActivity = useMutation({
    mutationFn: async ({ activityType, description, accepted, metadata }: LogActivityParams) => {
      if (!businessId || !profileId) {
        throw new Error('Business ID and Profile ID required');
      }

      const { data, error } = await supabase
        .from('ai_activity_log')
        .insert({
          business_id: businessId,
          user_id: profileId,
          activity_type: activityType,
          description,
          accepted,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-activity-log', businessId] });
    },
  });

  // Get daily digest summary
  const dailyDigest = useQuery({
    queryKey: ['ai-activity-log', businessId, 'daily-digest'],
    queryFn: async () => {
      if (!businessId) return null;
      
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('ai_activity_log')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', startOfDay.toISOString());

      if (error) throw error;

      const activities = data as AIActivity[];
      
      return {
        totalSuggestions: activities.filter(a => a.activity_type === 'suggestion').length,
        acceptedSuggestions: activities.filter(a => a.activity_type === 'suggestion' && a.accepted === true).length,
        optimizations: activities.filter(a => a.activity_type === 'optimization').length,
        predictions: activities.filter(a => a.activity_type === 'prediction').length,
        conflictsResolved: activities.filter(a => a.activity_type === 'conflict_resolution').length,
        autoScheduled: activities.filter(a => a.activity_type === 'auto_schedule').length,
      };
    },
    enabled: !!businessId,
  });

  return {
    recentActivity: recentActivity.data || [],
    pendingSuggestionsCount: pendingSuggestionsCount.data || 0,
    dailyDigest: dailyDigest.data,
    isLoading: recentActivity.isLoading || pendingSuggestionsCount.isLoading,
    logActivity: logActivity.mutateAsync,
  };
}

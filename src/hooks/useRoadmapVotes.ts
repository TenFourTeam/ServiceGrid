import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBrowserFingerprint } from './useBrowserFingerprint';

export function useVoteStatus(featureId: string) {
  const voterIdentifier = useBrowserFingerprint();

  return useQuery({
    queryKey: ['vote-status', featureId, voterIdentifier],
    queryFn: async () => {
      if (!voterIdentifier) return { hasVoted: false };

      const params = new URLSearchParams({ featureId, voterIdentifier });
      const { data, error } = await supabase.functions.invoke('roadmap-vote', {
        method: 'GET',
        body: params,
      });

      if (error) throw error;
      return data as { hasVoted: boolean };
    },
    enabled: !!voterIdentifier && !!featureId,
  });
}

export function useVote() {
  const queryClient = useQueryClient();
  const voterIdentifier = useBrowserFingerprint();

  return useMutation({
    mutationFn: async (featureId: string) => {
      if (!voterIdentifier) throw new Error('Voter identifier not available');

      const { data, error } = await supabase.functions.invoke('roadmap-vote', {
        method: 'POST',
        body: { featureId, voterIdentifier },
      });

      if (error) throw error;
      return data as { success: boolean; voteCount: number };
    },
    onMutate: async (featureId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['roadmap-features'] });
      await queryClient.cancelQueries({ queryKey: ['vote-status', featureId] });

      // Optimistically update vote status
      queryClient.setQueryData(['vote-status', featureId, voterIdentifier], { hasVoted: true });

      // Optimistically update feature vote count
      queryClient.setQueriesData({ queryKey: ['roadmap-features'] }, (old: any) => {
        if (!old) return old;
        return old.map((feature: any) =>
          feature.id === featureId
            ? { ...feature, vote_count: feature.vote_count + 1 }
            : feature
        );
      });
    },
    onSuccess: (_, featureId) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-feature', featureId] });
      queryClient.invalidateQueries({ queryKey: ['vote-status', featureId] });
    },
    onError: (error: any, featureId) => {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      queryClient.invalidateQueries({ queryKey: ['vote-status', featureId] });
      
      if (error.message?.includes('Already voted')) {
        toast.error('You have already voted for this feature');
      } else {
        toast.error(error.message || 'Failed to vote');
      }
    },
  });
}

export function useUnvote() {
  const queryClient = useQueryClient();
  const voterIdentifier = useBrowserFingerprint();

  return useMutation({
    mutationFn: async (featureId: string) => {
      if (!voterIdentifier) throw new Error('Voter identifier not available');

      const { data, error } = await supabase.functions.invoke('roadmap-vote', {
        method: 'DELETE',
        body: { featureId, voterIdentifier },
      });

      if (error) throw error;
      return data as { success: boolean; voteCount: number };
    },
    onMutate: async (featureId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['roadmap-features'] });
      await queryClient.cancelQueries({ queryKey: ['vote-status', featureId] });

      // Optimistically update vote status
      queryClient.setQueryData(['vote-status', featureId, voterIdentifier], { hasVoted: false });

      // Optimistically update feature vote count
      queryClient.setQueriesData({ queryKey: ['roadmap-features'] }, (old: any) => {
        if (!old) return old;
        return old.map((feature: any) =>
          feature.id === featureId
            ? { ...feature, vote_count: Math.max(0, feature.vote_count - 1) }
            : feature
        );
      });
    },
    onSuccess: (_, featureId) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-feature', featureId] });
      queryClient.invalidateQueries({ queryKey: ['vote-status', featureId] });
    },
    onError: (error: any, featureId) => {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      queryClient.invalidateQueries({ queryKey: ['vote-status', featureId] });
      toast.error(error.message || 'Failed to remove vote');
    },
  });
}

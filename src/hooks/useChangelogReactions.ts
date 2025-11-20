import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChangelogEntry } from './useChangelogEntries';

const REACTIONS_STORAGE_KEY = 'changelog_reactions';

function getUserReactions(): Record<string, string[]> {
  const stored = localStorage.getItem(REACTIONS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveUserReactions(reactions: Record<string, string[]>) {
  localStorage.setItem(REACTIONS_STORAGE_KEY, JSON.stringify(reactions));
}

export function hasUserReacted(entryId: string, emoji: string): boolean {
  const reactions = getUserReactions();
  return reactions[entryId]?.includes(emoji) || false;
}

export function getUserReactionsForEntry(entryId: string): string[] {
  const reactions = getUserReactions();
  return reactions[entryId] || [];
}

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, emoji }: { entryId: string; emoji: string }) => {
      // Check if already reacted
      if (hasUserReacted(entryId, emoji)) {
        throw new Error('Already reacted with this emoji');
      }

      // Get current entry
      const entries = queryClient.getQueryData<ChangelogEntry[]>(['changelog-entries']) || [];
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) throw new Error('Entry not found');

      // Update reaction count
      const currentCount = entry.reaction_counts[emoji] || 0;
      const updatedReactionCounts = {
        ...entry.reaction_counts,
        [emoji]: currentCount + 1,
      };

      // Update in database
      const { error } = await supabase.functions.invoke('changelog-crud', {
        method: 'PATCH',
        body: {
          id: entryId,
          reaction_counts: updatedReactionCounts,
        },
      });

      if (error) throw error;

      // Store user reaction
      const reactions = getUserReactions();
      if (!reactions[entryId]) reactions[entryId] = [];
      reactions[entryId].push(emoji);
      saveUserReactions(reactions);

      return { entryId, emoji, updatedReactionCounts };
    },
    onMutate: async ({ entryId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ['changelog-entries'] });

      const previousEntries = queryClient.getQueryData<ChangelogEntry[]>(['changelog-entries']);

      queryClient.setQueryData<ChangelogEntry[]>(['changelog-entries'], (old = []) =>
        old.map((entry) => {
          if (entry.id === entryId) {
            const currentCount = entry.reaction_counts[emoji] || 0;
            return {
              ...entry,
              reaction_counts: {
                ...entry.reaction_counts,
                [emoji]: currentCount + 1,
              },
            };
          }
          return entry;
        })
      );

      return { previousEntries };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(['changelog-entries'], context.previousEntries);
      }
      
      if (error.message?.includes('Already reacted')) {
        toast.error('You have already reacted with this emoji');
      } else {
        toast.error(error.message || 'Failed to add reaction');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-entries'] });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, emoji }: { entryId: string; emoji: string }) => {
      // Check if user has reacted
      if (!hasUserReacted(entryId, emoji)) {
        throw new Error('You have not reacted with this emoji');
      }

      // Get current entry
      const entries = queryClient.getQueryData<ChangelogEntry[]>(['changelog-entries']) || [];
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) throw new Error('Entry not found');

      // Update reaction count
      const currentCount = entry.reaction_counts[emoji] || 0;
      const newCount = Math.max(0, currentCount - 1);
      const updatedReactionCounts = {
        ...entry.reaction_counts,
        [emoji]: newCount,
      };

      // Update in database
      const { error } = await supabase.functions.invoke('changelog-crud', {
        method: 'PATCH',
        body: {
          id: entryId,
          reaction_counts: updatedReactionCounts,
        },
      });

      if (error) throw error;

      // Remove user reaction
      const reactions = getUserReactions();
      if (reactions[entryId]) {
        reactions[entryId] = reactions[entryId].filter((e) => e !== emoji);
        if (reactions[entryId].length === 0) {
          delete reactions[entryId];
        }
        saveUserReactions(reactions);
      }

      return { entryId, emoji, updatedReactionCounts };
    },
    onMutate: async ({ entryId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ['changelog-entries'] });

      const previousEntries = queryClient.getQueryData<ChangelogEntry[]>(['changelog-entries']);

      queryClient.setQueryData<ChangelogEntry[]>(['changelog-entries'], (old = []) =>
        old.map((entry) => {
          if (entry.id === entryId) {
            const currentCount = entry.reaction_counts[emoji] || 0;
            const newCount = Math.max(0, currentCount - 1);
            return {
              ...entry,
              reaction_counts: {
                ...entry.reaction_counts,
                [emoji]: newCount,
              },
            };
          }
          return entry;
        })
      );

      return { previousEntries };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(['changelog-entries'], context.previousEntries);
      }
      toast.error(error.message || 'Failed to remove reaction');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-entries'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChangelogItem {
  id: string;
  section_id: string;
  content: string;
  sort_order: number;
  created_at: string;
}

export interface ChangelogSection {
  id: string;
  entry_id: string;
  emoji: string;
  title: string;
  sort_order: number;
  created_at: string;
  items: ChangelogItem[];
}

export interface ChangelogEntry {
  id: string;
  title: string;
  description: string | null;
  publish_date: string;
  tag: string | null;
  reaction_counts: Record<string, number>;
  created_at: string;
  updated_at: string;
  sections: ChangelogSection[];
}

interface UseChangelogEntriesFilters {
  sortBy?: 'newest' | 'oldest';
  limit?: number;
}

export function useChangelogEntries(filters?: UseChangelogEntriesFilters) {
  return useQuery({
    queryKey: ['changelog-entries', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const { data, error } = await supabase.functions.invoke('changelog-crud', {
        method: 'GET',
        body: null,
      });

      if (error) throw error;
      return data as ChangelogEntry[];
    },
  });
}

export function useChangelogEntry(id: string | null) {
  return useQuery({
    queryKey: ['changelog-entry', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase.functions.invoke('changelog-crud', {
        method: 'GET',
        body: null,
      });

      if (error) throw error;
      return data as ChangelogEntry;
    },
    enabled: !!id,
  });
}

interface CreateEntryData {
  title: string;
  description?: string;
  publish_date: string;
  tag?: string;
  sections: Array<{
    emoji: string;
    title: string;
    items: string[];
  }>;
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEntryData) => {
      const { data: result, error } = await supabase.functions.invoke('changelog-crud', {
        method: 'POST',
        body: data,
      });

      if (error) throw error;
      return result as ChangelogEntry;
    },
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: ['changelog-entries'] });
      
      const previousEntries = queryClient.getQueryData<ChangelogEntry[]>(['changelog-entries']);
      
      const optimisticEntry: ChangelogEntry = {
        id: crypto.randomUUID(),
        title: newEntry.title,
        description: newEntry.description || null,
        publish_date: newEntry.publish_date,
        tag: newEntry.tag || null,
        reaction_counts: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sections: newEntry.sections.map((section, idx) => ({
          id: crypto.randomUUID(),
          entry_id: '',
          emoji: section.emoji,
          title: section.title,
          sort_order: idx,
          created_at: new Date().toISOString(),
          items: section.items.map((content, itemIdx) => ({
            id: crypto.randomUUID(),
            section_id: '',
            content,
            sort_order: itemIdx,
            created_at: new Date().toISOString(),
          })),
        })),
      };

      queryClient.setQueryData<ChangelogEntry[]>(['changelog-entries'], (old = []) => [
        optimisticEntry,
        ...old,
      ]);

      return { previousEntries };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(['changelog-entries'], context.previousEntries);
      }
      toast.error(error.message || 'Failed to create changelog entry');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-entries'] });
      toast.success('Changelog entry created successfully');
    },
  });
}

interface UpdateEntryData {
  id: string;
  title?: string;
  description?: string;
  publish_date?: string;
  tag?: string;
  sections?: Array<{
    emoji: string;
    title: string;
    items: string[];
  }>;
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateEntryData) => {
      const { data: result, error } = await supabase.functions.invoke('changelog-crud', {
        method: 'PATCH',
        body: data,
      });

      if (error) throw error;
      return result as ChangelogEntry;
    },
    onMutate: async (updatedEntry) => {
      await queryClient.cancelQueries({ queryKey: ['changelog-entries'] });
      
      const previousEntries = queryClient.getQueryData<ChangelogEntry[]>(['changelog-entries']);
      
      queryClient.setQueryData<ChangelogEntry[]>(['changelog-entries'], (old = []) =>
        old.map((entry) => {
          if (entry.id === updatedEntry.id) {
            const updates: Partial<ChangelogEntry> = {
              updated_at: new Date().toISOString(),
            };
            if (updatedEntry.title !== undefined) updates.title = updatedEntry.title;
            if (updatedEntry.description !== undefined) updates.description = updatedEntry.description;
            if (updatedEntry.publish_date !== undefined) updates.publish_date = updatedEntry.publish_date;
            if (updatedEntry.tag !== undefined) updates.tag = updatedEntry.tag;
            return { ...entry, ...updates };
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
      toast.error(error.message || 'Failed to update changelog entry');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-entries'] });
      toast.success('Changelog entry updated successfully');
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke('changelog-crud', {
        method: 'DELETE',
        body: { id },
      });

      if (error) throw error;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['changelog-entries'] });
      
      const previousEntries = queryClient.getQueryData<ChangelogEntry[]>(['changelog-entries']);
      
      queryClient.setQueryData<ChangelogEntry[]>(['changelog-entries'], (old = []) =>
        old.filter((entry) => entry.id !== deletedId)
      );

      return { previousEntries };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(['changelog-entries'], context.previousEntries);
      }
      toast.error(error.message || 'Failed to delete changelog entry');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-entries'] });
      toast.success('Changelog entry deleted successfully');
    },
  });
}

// Real-time subscription
export function useChangelogRealtime() {
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['changelog-realtime'],
    queryFn: () => {
      const channel = supabase
        .channel('changelog-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'changelog_entries' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['changelog-entries'] });
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    },
    staleTime: Infinity,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { toast } from 'sonner';

export interface NoteCollaborator {
  user_id: string;
  is_viewing: boolean;
  last_viewed_at: string;
  cursor_position: any;
  profile: {
    id: string;
    full_name: string | null;
  };
}

export interface Note {
  id: string;
  business_id: string;
  job_id: string | null;
  parent_note_id: string | null;
  title: string;
  content_json: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_profile: {
    id: string;
    full_name: string | null;
  };
  collaborators: NoteCollaborator[];
}

export function useNotes(jobId?: string) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['notes', businessId, jobId],
    queryFn: async () => {
      const { data } = await authApi.invoke('notes-crud', {
        method: 'GET',
        queryParams: { jobId },
      });
      return data?.notes || [];
    },
    enabled: !!businessId && !!jobId,
  });
}

export function useNote(noteId: string | undefined) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['note', businessId, noteId],
    queryFn: async () => {
      const { data } = await authApi.invoke('notes-crud', {
        method: 'GET',
        queryParams: { noteId },
      });
      return data?.note;
    },
    enabled: !!businessId && !!noteId,
    refetchInterval: 30000,
  });
}

export function useCreateNote() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newNote: { title: string; content_json: any; job_id: string }) => {
      const { data } = await authApi.invoke('notes-crud', {
        method: 'POST',
        body: JSON.stringify(newNote),
      });
      return data?.note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', businessId, variables.job_id] });
      toast.success('Note created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create note: ${error.message}`);
    },
  });
}

export function useUpdateNote() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      updates,
    }: {
      noteId: string;
      updates: { title?: string; content_json?: any; createVersion?: boolean };
    }) => {
      const { data } = await authApi.invoke('notes-crud', {
        method: 'PATCH',
        queryParams: { noteId },
        body: JSON.stringify(updates),
      });
      return data?.note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['note', businessId, variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes', businessId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to save note: ${error.message}`);
    },
  });
}

export function useDeleteNote() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      await authApi.invoke('notes-crud', {
        method: 'DELETE',
        queryParams: { noteId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', businessId] });
      toast.success('Note deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete note: ${error.message}`);
    },
  });
}

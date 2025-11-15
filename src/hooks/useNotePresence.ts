import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import type { NoteCollaborator } from './useNotes';

export function useNotePresence(noteId: string | undefined) {
  const authApi = useAuthApi();
  const { businessId, profileId } = useBusinessContext();
  const [collaborators, setCollaborators] = useState<NoteCollaborator[]>([]);

  const updatePresence = async (cursorPosition?: any, isViewing = true) => {
    if (!noteId || !businessId) return;

    await authApi.invoke('note-presence', {
      method: 'POST',
      queryParams: { noteId },
      body: JSON.stringify({ cursorPosition, isViewing }),
    });
  };

  useEffect(() => {
    if (!noteId) return;

    const channel = supabase
      .channel(`note-presence:${noteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sg_note_collaborators',
          filter: `note_id=eq.${noteId}`,
        },
        async () => {
          const { data } = await authApi.invoke('note-presence', {
            method: 'GET',
            queryParams: { noteId },
          });

          if (data?.collaborators) {
            setCollaborators(data.collaborators);
          }
        }
      )
      .subscribe();

    updatePresence(null, true);

    const interval = setInterval(() => {
      updatePresence(null, true);
    }, 30000);

    return () => {
      updatePresence(null, false);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [noteId, businessId]);

  return {
    collaborators: collaborators.filter(c => c.user_id !== profileId),
    updatePresence,
  };
}

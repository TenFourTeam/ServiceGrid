import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useNotes, useCreateNote, useDeleteNote } from '@/hooks/useNotes';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface NotesListProps {
  jobId?: string;
  onNoteSelect: (noteId: string) => void;
  selectedNoteId?: string;
}

export function NotesList({ jobId, onNoteSelect, selectedNoteId }: NotesListProps) {
  const { data: notes, isLoading } = useNotes(jobId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const handleCreateNote = async () => {
    if (!jobId) return;

    const newNote = await createNote.mutateAsync({
      title: 'Untitled Note',
      content_json: { type: 'doc', content: [] },
      job_id: jobId,
    });

    if (newNote) {
      onNoteSelect(newNote.id);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote.mutateAsync(noteId);
    if (selectedNoteId === noteId) {
      onNoteSelect('');
    }
    setNoteToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={handleCreateNote} className="w-full" disabled={!jobId}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {notes && notes.length > 0 ? (
          notes.map((note) => (
            <Card
              key={note.id}
              className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                selectedNoteId === note.id ? 'bg-accent border-primary' : ''
              }`}
              onClick={() => onNoteSelect(note.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <h3 className="font-medium truncate">{note.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteToDelete(note.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notes yet</p>
            <p className="text-sm">Click "New Note" to get started</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => noteToDelete && handleDeleteNote(noteToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

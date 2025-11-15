import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save } from 'lucide-react';
import { useNote, useUpdateNote } from '@/hooks/useNotes';
import { useNotePresence } from '@/hooks/useNotePresence';
import { TiptapEditor } from './TiptapEditor';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { data: note, isLoading } = useNote(noteId);
  const updateNote = useUpdateNote();
  const { collaborators } = useNotePresence(noteId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content_json);
      setHasUnsavedChanges(false);
    }
  }, [note]);

  // Auto-save with debounce - no toast
  useEffect(() => {
    if (!hasUnsavedChanges || !note) return;

    const timer = setTimeout(async () => {
      try {
        await updateNote.mutateAsync({
          noteId: note.id,
          updates: {
            title,
            content_json: content,
            createVersion: false,
          },
        });
        setHasUnsavedChanges(false);
      } catch (error) {
        toast.error('Failed to auto-save note');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, hasUnsavedChanges, note]);

  const handleSave = async () => {
    if (!note) return;

    try {
      await updateNote.mutateAsync({
        noteId: note.id,
        updates: {
          title,
          content_json: content,
          createVersion: true,
        },
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      // Error toast handled by mutation hook
    }
  };

  const handleContentChange = (newContent: any) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="text-lg font-semibold"
            placeholder="Note title..."
          />
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || updateNote.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateNote.isPending ? 'Saving...' : hasUnsavedChanges ? 'Save' : 'Saved'}
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Last updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
          </span>
          {collaborators.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs">Active collaborators:</span>
              {collaborators.map((collab) => (
                <Badge key={collab.user_id} variant="secondary" className="text-xs">
                  {collab.profile.full_name || 'Unknown'}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <TiptapEditor
          content={content}
          onChange={handleContentChange}
          editable={true}
        />
      </div>
    </div>
  );
}

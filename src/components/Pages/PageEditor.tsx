import { useState, useEffect } from 'react';
import { usePage, useUpdatePage } from '@/hooks/usePages';
import { usePagePresence } from '@/hooks/usePagePresence';
import { TiptapEditor } from './TiptapEditor';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PageEditorProps {
  pageId: string;
}

export function PageEditor({ pageId }: PageEditorProps) {
  const { data: page, isLoading } = usePage(pageId);
  const updatePage = useUpdatePage();
  const { collaborators, updatePresence } = usePagePresence(pageId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setContent(page.content_json);
    }
  }, [page]);

  const handleSave = async () => {
    if (!page) return;

    try {
      await updatePage.mutateAsync({
        pageId: page.id,
        updates: {
          title,
          content_json: content,
          createVersion: true,
          changeSummary: 'Manual save',
        },
      });
      setHasUnsavedChanges(false);
      toast.success('Page saved');
    } catch (error) {
      toast.error('Failed to save page');
    }
  };

  const handleContentChange = (json: any) => {
    setContent(json);
    setHasUnsavedChanges(true);
  };

  const handleCursorChange = (position: any) => {
    updatePresence(position, true);
  };

  if (isLoading || !page) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 space-y-4 bg-background">
        <div className="flex items-center justify-between gap-4">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="text-2xl font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
            placeholder="Untitled Page"
          />
          <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
            <Save className="h-4 w-4 mr-2" />
            {hasUnsavedChanges ? 'Save' : 'Saved'}
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              Updated {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
            </span>
          </div>

          {collaborators.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <div className="flex gap-1">
                {collaborators.map((collab) => (
                  <Badge key={collab.user_id} variant="secondary" className="text-xs">
                    {collab.profile.full_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <TiptapEditor
          content={content}
          onChange={handleContentChange}
          onCursorChange={handleCursorChange}
          editable={true}
        />
      </div>
    </div>
  );
}
import { usePages, useCreatePage, useDeletePage } from '@/hooks/usePages';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PagesListProps {
  jobId?: string;
  onPageSelect: (pageId: string) => void;
  selectedPageId?: string;
}

export function PagesList({ jobId, onPageSelect, selectedPageId }: PagesListProps) {
  const { data: pages = [], isLoading } = usePages(jobId);
  const createPage = useCreatePage();
  const deletePage = useDeletePage();

  const handleCreatePage = async () => {
    try {
      const newPage = await createPage.mutateAsync({
        title: 'Untitled Page',
        job_id: jobId,
        content_json: { type: 'doc', content: [] },
      });
      toast.success('Page created');
      onPageSelect(newPage.id);
    } catch (error) {
      toast.error('Failed to create page');
    }
  };

  const handleDeletePage = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this page?')) return;

    try {
      await deletePage.mutateAsync(pageId);
      toast.success('Page deleted');
    } catch (error) {
      toast.error('Failed to delete page');
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading pages...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pages</h3>
        <Button onClick={handleCreatePage} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>

      <div className="space-y-2">
        {pages.map((page) => (
          <Card
            key={page.id}
            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
              selectedPageId === page.id ? 'border-primary' : ''
            }`}
            onClick={() => onPageSelect(page.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{page.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeletePage(page.id, e)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {pages.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pages yet. Create your first page to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
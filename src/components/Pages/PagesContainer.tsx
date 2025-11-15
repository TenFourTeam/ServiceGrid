import { useState } from 'react';
import { PagesList } from './PagesList';
import { PageEditor } from './PageEditor';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { FileText } from 'lucide-react';

interface PagesContainerProps {
  jobId?: string;
}

export function PagesContainer({ jobId }: PagesContainerProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>();

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
        <div className="h-full overflow-auto">
          <PagesList
            jobId={jobId}
            onPageSelect={setSelectedPageId}
            selectedPageId={selectedPageId}
          />
        </div>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={70}>
        <div className="h-full overflow-hidden">
          {selectedPageId ? (
            <PageEditor pageId={selectedPageId} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/30">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a page to start editing</p>
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
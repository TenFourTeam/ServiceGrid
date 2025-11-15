import { useState } from 'react';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { FileText } from 'lucide-react';

interface NotesContainerProps {
  jobId?: string;
}

export function NotesContainer({ jobId }: NotesContainerProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>();

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
        <div className="h-full overflow-auto">
          <NotesList
            jobId={jobId}
            onNoteSelect={setSelectedNoteId}
            selectedNoteId={selectedNoteId}
          />
        </div>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={70}>
        <div className="h-full overflow-hidden">
          {selectedNoteId ? (
            <NoteEditor noteId={selectedNoteId} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/30">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a note to start editing</p>
              </div>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

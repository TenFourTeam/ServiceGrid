import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Trash2, Eye, Sparkles, Loader2 } from 'lucide-react';
import { useAIArtifacts } from '@/hooks/useAIArtifacts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import LoadingScreen from '@/components/LoadingScreen';

interface ArtifactsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtifactsViewer({ open, onOpenChange }: ArtifactsViewerProps) {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'overview' | 'summary'>('all');
  
  const { data: artifacts, isLoading } = useAIArtifacts();

  const filteredArtifacts = artifacts?.filter(artifact => {
    if (filter === 'all') return true;
    if (filter === 'overview') return artifact.artifact_type === 'overview';
    if (filter === 'summary') return artifact.artifact_type.includes('summary');
    return true;
  }) || [];

  const selectedArtifact = artifacts?.find(a => a.id === selectedArtifactId);

  const handleDownload = (artifact: typeof artifacts[0]) => {
    const blob = new Blob([artifact.content_markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.artifact_type}-${format(new Date(artifact.created_at), 'yyyy-MM-dd')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded artifact');
  };

  const getTypeLabel = (type: string) => {
    if (type === 'overview') return 'Project Overview';
    if (type === 'team_summary') return 'Team Summary';
    if (type === 'customer_summary') return 'Customer Summary';
    return type;
  };

  if (selectedArtifact) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedArtifact.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-2 pb-4">
            <Button onClick={() => handleDownload(selectedArtifact)} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setSelectedArtifactId(null)} variant="outline" size="sm" className="ml-auto">
              Back to List
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="prose prose-sm max-w-none p-6">
              <ReactMarkdown>{selectedArtifact.content_markdown}</ReactMarkdown>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Generated Documents
          </DialogTitle>
        </DialogHeader>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="overview">Overviews</TabsTrigger>
            <TabsTrigger value="summary">Summaries</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="flex-1 overflow-hidden mt-4">
            {isLoading ? (
              <LoadingScreen />
            ) : filteredArtifacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Generate your first AI document using the Overview or Summary tools
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-3 pr-4">
                  {filteredArtifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedArtifactId(artifact.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                            <h4 className="font-semibold truncate">{artifact.title}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                              {getTypeLabel(artifact.artifact_type)}
                            </span>
                            <span>{format(new Date(artifact.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          {artifact.metadata?.metrics && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {artifact.metadata.metrics.totalJobs && (
                                <span>{artifact.metadata.metrics.totalJobs} jobs • </span>
                              )}
                              {artifact.metadata.metrics.completedJobs && (
                                <span>{artifact.metadata.metrics.completedJobs} completed</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedArtifactId(artifact.id);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(artifact);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

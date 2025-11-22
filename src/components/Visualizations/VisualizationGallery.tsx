import { useState } from 'react';
import { useVisualizationsByJob } from '@/hooks/useVisualizationsByJob';
import { useDeleteVisualization } from '@/hooks/useDeleteVisualization';
import { BeforeAfterPair } from '@/types/visualizations';
import { VisualizationCard } from './VisualizationCard';
import { BeforeAfterComparison } from './BeforeAfterComparison';
import { BeforeAfterVisualizationDialog } from './BeforeAfterVisualizationDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Sparkles } from 'lucide-react';
import { downloadAllVariations } from '@/utils/visualization-helpers';

interface VisualizationGalleryProps {
  jobId: string;
  onGenerateNew?: () => void;
}

export function VisualizationGallery({ jobId, onGenerateNew }: VisualizationGalleryProps) {
  const { data: pairs = [], isLoading } = useVisualizationsByJob(jobId);
  const deleteVisualization = useDeleteVisualization();
  
  const [selectedPair, setSelectedPair] = useState<BeforeAfterPair | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pairToDelete, setPairToDelete] = useState<BeforeAfterPair | null>(null);

  const totalVariations = pairs.reduce((sum, pair) => sum + pair.variations.length, 0);

  const handleViewComparison = (pair: BeforeAfterPair) => {
    setSelectedPair(pair);
    setComparisonOpen(true);
  };

  const handleRegenerate = (pair: BeforeAfterPair) => {
    setSelectedPair(pair);
    setRegenerateDialogOpen(true);
  };

  const handleDeleteClick = (pair: BeforeAfterPair) => {
    setPairToDelete(pair);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pairToDelete) return;
    
    // Delete all variations in this pair
    for (const variation of pairToDelete.variations) {
      await deleteVisualization.mutateAsync(variation.id);
    }
    
    setDeleteDialogOpen(false);
    setPairToDelete(null);
  };

  const handleDownloadAll = (pair: BeforeAfterPair) => {
    downloadAllVariations(pair.variations);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (pairs.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No visualizations yet</h3>
        <p className="text-muted-foreground mb-4">
          Generate AI-powered before/after previews from your job photos
        </p>
        {onGenerateNew && (
          <Button onClick={onGenerateNew}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Visualization
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with stats */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {pairs.length} Visualization{pairs.length !== 1 ? 's' : ''}
          </h3>
          <Badge variant="secondary">
            {totalVariations} total variation{totalVariations !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Grid of before/after pairs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pairs.map(pair => (
            <VisualizationCard
              key={pair.generationId}
              beforeAfterPair={pair}
              onViewComparison={() => handleViewComparison(pair)}
              onRegenerate={() => handleRegenerate(pair)}
              onDelete={() => handleDeleteClick(pair)}
              onDownload={() => handleDownloadAll(pair)}
            />
          ))}
        </div>
      </div>

      {/* Comparison Dialog */}
      {selectedPair && (
        <BeforeAfterComparison
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
          beforeAfterPair={selectedPair}
          onRegenerate={() => {
            setComparisonOpen(false);
            handleRegenerate(selectedPair);
          }}
        />
      )}

      {/* Regenerate Dialog */}
      {selectedPair && (
        <BeforeAfterVisualizationDialog
          open={regenerateDialogOpen}
          onOpenChange={setRegenerateDialogOpen}
          beforePhoto={selectedPair.beforePhoto}
          jobId={jobId}
          onVisualizationsGenerated={() => setRegenerateDialogOpen(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visualization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {pairToDelete?.variations.length || 0} variation
              {pairToDelete?.variations.length !== 1 ? 's' : ''} of this visualization.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

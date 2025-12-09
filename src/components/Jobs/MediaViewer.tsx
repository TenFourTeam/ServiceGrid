import { useState, useEffect, lazy, Suspense } from 'react';
import { MediaItem } from '@/hooks/useJobMedia';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Camera, 
  MapPin, 
  Calendar, 
  File,
  ExternalLink,
  AlertCircle,
  Pencil,
  Tag,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { TagInput } from '@/components/Media/TagInput';
import { useUpdateMediaTags } from '@/hooks/useMediaTags';
import { useUpdateMediaAnnotations } from '@/hooks/useMediaAnnotations';

// Lazy load AnnotationEditor to avoid eager loading react-konva
const AnnotationEditor = lazy(() => 
  import('@/components/Media/AnnotationEditor').then(mod => ({ 
    default: mod.AnnotationEditor 
  }))
);

interface MediaViewerProps {
  media: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onGenerateVisualization?: (mediaItem: MediaItem) => void;
  onSwitchToVisualizationsTab?: () => void;
  visualizationCounts?: Map<string, number>;
}

export function MediaViewer({ media, initialIndex, isOpen, onClose, onGenerateVisualization, onSwitchToVisualizationsTab, visualizationCounts }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const currentMedia = media[currentIndex];
  const updateMediaTags = useUpdateMediaTags();
  const updateMediaAnnotations = useUpdateMediaAnnotations();

  // Debug logging for media viewer issues
  console.log('[MediaViewer] isOpen:', isOpen, 'media.length:', media.length, 'currentIndex:', currentIndex, 'currentMedia:', currentMedia);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < media.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, media.length, onClose]);

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentIndex < media.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!currentMedia) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[95vh] p-0 border-0 bg-black/95">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          {currentMedia.file_type === 'photo' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAnnotationEditor(true)}
              className="text-white hover:bg-white/20"
              title="Annotate image"
            >
              <Pencil className="w-5 h-5" />
              {currentMedia.has_annotations && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex h-full">
          <div className="flex-1 flex flex-col">
            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 disabled:opacity-30"
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={currentIndex === media.length - 1}
                  className="absolute right-4 md:right-[21rem] top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 disabled:opacity-30"
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            <div className="flex-1 flex items-center justify-center p-4">
              {currentMedia.file_type === 'photo' ? (
                <img
                  src={currentMedia.blobUrl || currentMedia.public_url}
                  alt={currentMedia.original_filename}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video
                  src={currentMedia.blobUrl || currentMedia.public_url}
                  poster={currentMedia.thumbnail_url}
                  controls
                  className="max-w-full max-h-full"
                  autoPlay
                >
                  Your browser does not support video playback.
                </video>
              )}
            </div>

            {media.length > 1 && (
              <div className="bg-black/50 backdrop-blur-sm p-4">
                <Carousel
                  opts={{
                    align: 'start',
                    dragFree: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {media.map((item, index) => (
                      <CarouselItem key={item.id} className="pl-2 basis-1/10">
                        <div
                          onClick={() => setCurrentIndex(index)}
                          className={cn(
                            'cursor-pointer rounded-md overflow-hidden border-2 transition-all',
                            index === currentIndex
                              ? 'border-primary scale-110'
                              : 'border-transparent hover:border-white/50'
                          )}
                        >
                          <img
                            src={item.blobUrl || item.thumbnail_url || item.public_url}
                            alt={item.original_filename}
                            className="w-16 h-16 object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            )}
          </div>

          <div className="w-80 bg-background/95 backdrop-blur-sm p-6 overflow-y-auto hidden lg:block">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg truncate">{currentMedia.original_filename}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentIndex + 1} of {media.length}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <File className="w-4 h-4" />
                  <span>{formatFileSize(currentMedia.file_size)}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {currentMedia.file_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDistanceToNow(new Date(currentMedia.created_at), { addSuffix: true })}</span>
                </div>
                {currentMedia.upload_status !== 'completed' && (
                  <Badge variant="secondary">Processing...</Badge>
                )}
              </div>

              {currentMedia.metadata?.exif && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Camera Info
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {currentMedia.metadata.exif.make && (
                      <p>{currentMedia.metadata.exif.make} {currentMedia.metadata.exif.model}</p>
                    )}
                    {currentMedia.metadata.exif.dateTime && (
                      <p>Taken: {new Date(currentMedia.metadata.exif.dateTime).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}

              {currentMedia.metadata?.gps && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </h4>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-mono">
                      {currentMedia.metadata.gps.latitude.toFixed(6)}, {currentMedia.metadata.gps.longitude.toFixed(6)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const url = `https://www.google.com/maps?q=${currentMedia.metadata!.gps!.latitude},${currentMedia.metadata!.gps!.longitude}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in Maps
                    </Button>
                  </div>
                </div>
              )}

              {/* Tags Section */}
              <div className="border-t border-border pt-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </h4>
                <TagInput
                  tags={currentMedia.tags || []}
                  availableTags={[]}
                  onTagsChange={(newTags) => {
                    updateMediaTags.mutate({ 
                      mediaId: currentMedia.id, 
                      tags: newTags 
                    });
                  }}
                  placeholder="Add tags..."
                />
              </div>

              {/* AI Visualizations Section */}
              {currentMedia.file_type === 'photo' && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Visualizations
                  </h4>
                  
                  {visualizationCounts?.get(currentMedia.id) ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {visualizationCounts.get(currentMedia.id)} visualization{visualizationCounts.get(currentMedia.id) !== 1 ? 's' : ''} created from this photo
                      </p>
                      {onSwitchToVisualizationsTab && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={onSwitchToVisualizationsTab}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          View Visualizations
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Generate AI-powered "after" preview from this photo
                      </p>
                      {onGenerateVisualization && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => onGenerateVisualization(currentMedia)}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Visualization
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {currentMedia.isOptimistic && (
                <div className="border-t border-border pt-4">
                  {currentMedia.upload_status === 'uploading' && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Uploading...</p>
                      <Progress value={currentMedia.uploadProgress || 0} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentMedia.uploadProgress || 0}%
                      </p>
                    </div>
                  )}
                  {currentMedia.upload_status === 'failed' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Upload Failed</AlertTitle>
                      <AlertDescription className="text-xs">
                        {currentMedia.uploadError || 'Unknown error'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Annotation Editor Dialog */}
        {currentMedia.file_type === 'photo' && (
          <Dialog open={showAnnotationEditor} onOpenChange={setShowAnnotationEditor}>
            <DialogContent className="max-w-[95vw] h-[95vh] p-0">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading annotation editor...</p>
                  </div>
                </div>
              }>
                <AnnotationEditor
                  imageUrl={currentMedia.blobUrl || currentMedia.public_url}
                  existingAnnotations={currentMedia.annotations || []}
                  onSave={(annotations) => {
                    updateMediaAnnotations.mutate({
                      mediaId: currentMedia.id,
                      annotations
                    });
                    setShowAnnotationEditor(false);
                  }}
                  onCancel={() => setShowAnnotationEditor(false)}
                />
              </Suspense>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo } from 'react';
import { MediaItem } from '@/hooks/useJobMedia';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Video, MapPin, Camera, Cloud, Sparkles, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGoogleDriveFileMappings } from '@/hooks/useGoogleDriveFiles';

interface MediaGalleryProps {
  media: MediaItem[];
  isLoading?: boolean;
  onMediaClick: (mediaItem: MediaItem, index: number) => void;
  onGenerateVisualization?: (mediaItem: MediaItem) => void;
  visualizationSourceIds?: Set<string>;
}

export function MediaGallery({ media, isLoading, onMediaClick, onGenerateVisualization, visualizationSourceIds }: MediaGalleryProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { data: driveMappings } = useGoogleDriveFileMappings('media');

  // Extract all unique tags from media
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    media.forEach(item => {
      item.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [media]);

  // Check if media item is synced to Drive
  const isSyncedToDrive = (mediaId: string) => {
    return driveMappings?.some(
      mapping => mapping.sg_entity_id === mediaId && mapping.sync_status === 'synced'
    );
  };

  // Filter media by selected tags
  const filteredMedia = useMemo(() => {
    if (selectedTags.length === 0) return media;
    return media.filter(item => 
      selectedTags.some(tag => item.tags?.includes(tag))
    );
  }, [media, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-20 rounded-md" />
        ))}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Camera className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm">No photos or videos yet</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      {/* Tag Filter UI */}
      {allTags.length > 0 && (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Filter:</span>
          <div className="flex gap-2">
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {filteredMedia.map((item, index) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <div
                onClick={() => onMediaClick(item, index)}
                className="relative cursor-pointer group overflow-hidden rounded-md border border-border hover:border-primary transition-all"
              >
                <img
                  src={item.blobUrl || item.thumbnail_url || item.public_url}
                  alt={item.original_filename}
                  loading="lazy"
                  className="w-full h-20 object-cover transition-transform group-hover:scale-105"
                />
                
                {/* Context menu for photos */}
                {item.file_type === 'photo' && onGenerateVisualization && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onGenerateVisualization(item);
                        }}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Visualization
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                
                {/* Badge if this photo has visualizations */}
                {visualizationSourceIds?.has(item.id) && (
                  <Badge 
                    className="absolute bottom-1 right-1 text-xs bg-primary/90" 
                    variant="default"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Has Viz
                  </Badge>
                )}
                
                {item.file_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Video className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                )}
                
                {item.upload_status !== 'completed' && (
                  <Badge className="absolute top-1 right-1 text-xs" variant="secondary">
                    Processing...
                  </Badge>
                )}
                
                {item.metadata?.gps && (
                  <MapPin className="absolute bottom-1 left-1 w-4 h-4 text-white drop-shadow-lg" />
                )}
                
                {isSyncedToDrive(item.id) && (
                  <div className="absolute top-1 left-1">
                    <Badge variant="secondary" className="text-xs px-1 py-0 h-4 bg-blue-500/90 text-white border-none flex items-center gap-0.5">
                      <Cloud className="w-3 h-3" />
                    </Badge>
                  </div>
                )}
                
                {/* Tag badges on thumbnails */}
                {item.tags && item.tags.length > 0 && (
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    {item.tags.slice(0, 2).map((tag, idx) => {
                      // Determine badge color based on tag type
                      const isRisk = tag.startsWith('risk:') || tag.startsWith('hazard:');
                      const isOpportunity = tag.startsWith('opportunity:');
                      const isAssessment = tag.startsWith('assessment:');
                      
                      return (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className={cn(
                            "text-[10px] px-1 py-0 h-4 border-none",
                            isRisk && "bg-red-500/90 text-white",
                            isOpportunity && "bg-green-500/90 text-white",
                            isAssessment && "bg-blue-500/90 text-white",
                            !isRisk && !isOpportunity && !isAssessment && "bg-black/70 text-white"
                          )}
                        >
                          {tag}
                        </Badge>
                      );
                    })}
                    {item.tags.length > 2 && (
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] px-1 py-0 h-4 bg-black/70 text-white border-none"
                      >
                        +{item.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
                
                {item.isOptimistic && item.upload_status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-xs font-semibold">
                      {item.uploadProgress || 0}%
                    </div>
                  </div>
                )}
                
                {item.upload_status === 'failed' && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                    <Badge variant="destructive" className="text-xs">
                      Failed
                    </Badge>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1 text-xs">
                <p className="font-semibold truncate">{item.original_filename}</p>
                <p className="text-muted-foreground">
                  {formatFileSize(item.file_size)} • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
                {item.uploadError && (
                  <p className="text-destructive">Error: {item.uploadError}</p>
                )}
                {item.metadata?.exif?.make && (
                  <p className="flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    {item.metadata.exif.make} {item.metadata.exif.model}
                  </p>
                )}
                {item.metadata?.gps && (
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {item.metadata.gps.latitude.toFixed(4)}, {item.metadata.gps.longitude.toFixed(4)}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

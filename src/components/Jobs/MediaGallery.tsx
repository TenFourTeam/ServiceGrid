import { MediaItem } from '@/hooks/useJobMedia';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Video, MapPin, Camera } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MediaGalleryProps {
  media: MediaItem[];
  isLoading?: boolean;
  onMediaClick: (mediaItem: MediaItem, index: number) => void;
}

export function MediaGallery({ media, isLoading, onMediaClick }: MediaGalleryProps) {
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
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {media.map((item, index) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <div
                onClick={() => onMediaClick(item, index)}
                className="relative cursor-pointer group overflow-hidden rounded-md border border-border hover:border-primary transition-all"
              >
                <img
                  src={item.thumbnail_url || item.public_url}
                  alt={item.original_filename}
                  loading="lazy"
                  className="w-full h-20 object-cover transition-transform group-hover:scale-105"
                />
                
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
              </div>
            </TooltipTrigger>
            
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1 text-xs">
                <p className="font-semibold truncate">{item.original_filename}</p>
                <p className="text-muted-foreground">
                  {formatFileSize(item.file_size)} • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
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

import { useState } from 'react';
import { Camera, Check, Image as ImageIcon, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCompleteChecklistItem, type ChecklistItem as ChecklistItemType } from '@/hooks/useJobChecklist';
import { useJobMedia, createOptimisticMediaItem } from '@/hooks/useJobMedia';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ChecklistItemProps {
  item: ChecklistItemType;
  jobId: string;
}

export function ChecklistItem({ item, jobId }: ChecklistItemProps) {
  const completeItem = useCompleteChecklistItem();
  const [isUploading, setIsUploading] = useState(false);
  const { data: allMedia } = useJobMedia(jobId);
  const { uploadMedia } = useMediaUpload();
  const { businessId } = useBusinessContext();

  // Filter media for this checklist item
  const itemMedia = allMedia?.filter(m => 
    m.metadata && (m.metadata as any).checklist_item_id === item.id
  ) || [];

  const hasEnoughPhotos = itemMedia.length >= item.required_photo_count;
  const isPhotoGated = item.required_photo_count > 0 && !hasEnoughPhotos;

  const handleToggle = async () => {
    if (!item.is_completed && isPhotoGated) {
      return; // Checkbox is disabled via UI
    }

    completeItem.mutate({
      itemId: item.id,
      isCompleted: !item.is_completed,
      jobId,
    });
  };

  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !businessId) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        await uploadMedia(file, {
          jobId,
          businessId,
          checklistItemId: item.id,
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className={cn(
      "transition-all",
      item.is_completed && "opacity-75 bg-muted/50"
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={item.is_completed}
            disabled={isPhotoGated || completeItem.isPending}
            onCheckedChange={handleToggle}
            className="mt-1"
          />

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div>
              <h4 className={cn(
                "font-medium",
                item.is_completed && "line-through text-muted-foreground"
              )}>
                {item.title}
              </h4>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              )}
            </div>

            {/* Photo Requirement */}
            {item.required_photo_count > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={hasEnoughPhotos ? "default" : "destructive"}
                  className="gap-1"
                >
                  <Camera className="h-3 w-3" />
                  Requires {item.required_photo_count} photo{item.required_photo_count > 1 ? 's' : ''}
                </Badge>
                
                {itemMedia.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {itemMedia.length} uploaded
                    </Badge>
                    {hasEnoughPhotos && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                )}

                {/* Photo Thumbnails */}
                {itemMedia.length > 0 && (
                  <div className="flex gap-1">
                    {itemMedia.slice(0, 3).map((media) => (
                      <img
                        key={media.id}
                        src={media.thumbnail_url || media.public_url}
                        alt="Item photo"
                        className="h-8 w-8 object-cover rounded border"
                      />
                    ))}
                    {itemMedia.length > 3 && (
                      <div className="h-8 w-8 rounded border flex items-center justify-center text-xs bg-muted">
                        +{itemMedia.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Completion Info */}
            {item.is_completed && item.completed_at && (
              <p className="text-xs text-muted-foreground">
                ✓ Completed {formatDistanceToNow(new Date(item.completed_at), { addSuffix: true })}
              </p>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <label className="cursor-pointer">
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*,video/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handleUploadPhoto}
                    disabled={isUploading}
                  />
                </label>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
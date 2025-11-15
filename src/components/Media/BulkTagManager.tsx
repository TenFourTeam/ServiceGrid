import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TagInput } from './TagInput';
import { MediaItem } from '@/hooks/useJobMedia';
import { toast } from 'sonner';

interface BulkTagManagerProps {
  media: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (mediaIds: string[], tags: string[]) => Promise<void>;
}

export function BulkTagManager({ media, isOpen, onClose, onSave }: BulkTagManagerProps) {
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<string[]>([]);

  const toggleMedia = (id: string) => {
    const newSet = new Set(selectedMedia);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMedia(newSet);
  };

  const handleSave = async () => {
    if (selectedMedia.size === 0) {
      toast.error('Select at least one item');
      return;
    }
    
    await onSave(Array.from(selectedMedia), tags);
    onClose();
    setSelectedMedia(new Set());
    setTags([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Tag Media</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Select Media Items:</h4>
            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {media.map(item => (
                <div key={item.id} className="relative">
                  <Checkbox
                    checked={selectedMedia.has(item.id)}
                    onCheckedChange={() => toggleMedia(item.id)}
                    className="absolute top-2 left-2 z-10 bg-background"
                  />
                  <img
                    src={item.thumbnail_url || item.public_url}
                    alt={item.original_filename}
                    className="w-full h-20 object-cover rounded border"
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-2">Add Tags:</h4>
            <TagInput tags={tags} onTagsChange={setTags} />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>
              Apply Tags to {selectedMedia.size} items
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

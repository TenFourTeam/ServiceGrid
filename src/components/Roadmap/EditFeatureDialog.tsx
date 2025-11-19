import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoadmapFeature, useUpdateFeature, useDeleteFeature } from '@/hooks/useRoadmapFeatures';

interface EditFeatureDialogProps {
  feature: RoadmapFeature;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFeatureDialog({ feature, open, onOpenChange }: EditFeatureDialogProps) {
  const [title, setTitle] = useState(feature.title);
  const [description, setDescription] = useState(feature.description);
  const [status, setStatus] = useState(feature.status);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateFeature = useUpdateFeature();
  const deleteFeature = useDeleteFeature();

  // Reset form when feature changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(feature.title);
      setDescription(feature.description);
      setStatus(feature.status);
    }
  }, [feature, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) return;

    updateFeature.mutate(
      {
        id: feature.id,
        title: title.trim(),
        description: description.trim(),
        status,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteFeature.mutate(feature.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        onOpenChange(false);
      },
    });
  };

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Feature</DialogTitle>
              <DialogDescription>
                Update the feature details or change its status.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary of the feature"
                  maxLength={200}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-right">
                  {title.length}/200 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the feature in detail"
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {description.length}/2000 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-consideration">Under Consideration</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="unlikely">Unlikely</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={updateFeature.isPending}
                className="sm:mr-auto"
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={updateFeature.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!isValid || updateFeature.isPending}>
                  {updateFeature.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{feature.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteFeature.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteFeature.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFeature.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { useUpdateEntry } from '@/hooks/useChangelogEntries';
import type { ChangelogEntry } from '@/hooks/useChangelogEntries';

interface Section {
  emoji: string;
  title: string;
  items: string[];
}

interface EditEntryDialogProps {
  entry: ChangelogEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEntryDialog({ entry, open, onOpenChange }: EditEntryDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [tag, setTag] = useState('');
  const [sections, setSections] = useState<Section[]>([]);

  const updateEntry = useUpdateEntry();

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setDescription(entry.description || '');
      setPublishDate(entry.publish_date);
      setTag(entry.tag || '');
      setSections(
        entry.sections.map((s) => ({
          emoji: s.emoji,
          title: s.title,
          items: s.items.map((item) => item.content),
        }))
      );
    }
  }, [entry]);

  const addSection = () => {
    setSections([...sections, { emoji: '🚀', title: '', items: [''] }]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: keyof Section, value: any) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const addItem = (sectionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].items.push('');
    setSections(updated);
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].items = updated[sectionIndex].items.filter(
      (_, i) => i !== itemIndex
    );
    setSections(updated);
  };

  const updateItem = (sectionIndex: number, itemIndex: number, value: string) => {
    const updated = [...sections];
    updated[sectionIndex].items[itemIndex] = value;
    setSections(updated);
  };

  const handleSubmit = () => {
    const validSections = sections
      .filter((s) => s.title && s.items.some((item) => item.trim()))
      .map((s) => ({
        emoji: s.emoji,
        title: s.title,
        items: s.items.filter((item) => item.trim()),
      }));

    updateEntry.mutate(
      {
        id: entry.id,
        title,
        description,
        publish_date: publishDate,
        tag: tag || undefined,
        sections: validSections,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const isValid =
    title.trim() &&
    publishDate &&
    sections.some((s) => s.title && s.items.some((item) => item.trim()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Changelog Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mobile Update"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this update..."
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publish_date">
                Publish Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="publish_date"
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag">Tag</Label>
              <Input
                id="tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g., Limitless"
                maxLength={50}
              />
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            <Label>
              Sections <span className="text-destructive">*</span>
            </Label>
            {sections.map((section, idx) => (
              <Card key={idx}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Emoji (✨)"
                      value={section.emoji}
                      onChange={(e) => updateSection(idx, 'emoji', e.target.value)}
                      maxLength={2}
                      className="w-16"
                    />
                    <Input
                      placeholder="Section title (New)"
                      value={section.title}
                      onChange={(e) => updateSection(idx, 'title', e.target.value)}
                      className="flex-1"
                    />
                    {sections.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(idx)}
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Items within section */}
                  <div className="space-y-2 pl-4">
                    {section.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex gap-2">
                        <Input
                          placeholder="• Item text"
                          value={item}
                          onChange={(e) => updateItem(idx, itemIdx, e.target.value)}
                          className="flex-1"
                        />
                        {section.items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(idx, itemIdx)}
                            type="button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addItem(idx)}
                      type="button"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={addSection}
              type="button"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || updateEntry.isPending}
            type="button"
          >
            {updateEntry.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

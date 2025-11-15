import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TagInputProps {
  tags: string[];
  availableTags?: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, availableTags = [], onTagsChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
    }
    setInputValue('');
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  };

  const suggestedTags = availableTags.filter(
    t => !tags.includes(t) && t.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map(tag => (
        <Badge key={tag} variant="secondary" className="gap-1">
          <Tag className="w-3 h-3" />
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="ml-1 hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6">
            <Plus className="w-3 h-3 mr-1" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(inputValue);
                }
              }}
              placeholder={placeholder || "Type tag name..."}
              className="h-8"
            />
            
            {suggestedTags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Suggestions:</p>
                {suggestedTags.map(tag => (
                  <Button
                    key={tag}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7"
                    onClick={() => addTag(tag)}
                  >
                    <Tag className="w-3 h-3 mr-2" />
                    {tag}
                  </Button>
                ))}
              </div>
            )}
            
            <Button
              onClick={() => addTag(inputValue)}
              disabled={!inputValue.trim()}
              className="w-full"
              size="sm"
            >
              Add "{inputValue}"
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

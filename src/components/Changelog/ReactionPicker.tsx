import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus } from 'lucide-react';

interface ReactionPickerProps {
  onSelectReaction: (emoji: string) => void;
}

const REACTIONS = ['👍', '🔥', '❤️', '🎉', '👏', '😍', '🚀', '💯'];

export function ReactionPicker({ onSelectReaction }: ReactionPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-4 gap-1">
          {REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => onSelectReaction(emoji)}
              className="text-lg p-2 h-auto"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

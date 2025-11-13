import { useEffect, useState, useRef } from 'react';
import { useBusinessMembersData } from '@/hooks/useBusinessMembers';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MentionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (userId: string, displayName: string) => void;
  searchQuery: string;
  anchorRect: DOMRect | null;
}

export function MentionPicker({ isOpen, onClose, onSelect, searchQuery, anchorRect }: MentionPickerProps) {
  const { data: members, isLoading } = useBusinessMembersData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Filter members based on search query
  const filteredMembers = members.filter(member => 
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const member = filteredMembers[selectedIndex];
        if (member) {
          onSelect(member.user_id, member.name || member.email || 'Unknown');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredMembers, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    itemsRef.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen || !anchorRect) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: anchorRect.left,
        top: anchorRect.top - 200,
        zIndex: 100,
      }}
      className="w-64"
    >
      <Popover open={isOpen} onOpenChange={onClose}>
        <PopoverContent 
          className="w-64 p-0" 
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {isLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading members...
                </div>
              )}
              {!isLoading && filteredMembers.length === 0 && (
                <CommandEmpty>No team members found.</CommandEmpty>
              )}
              {!isLoading && filteredMembers.length > 0 && (
                <CommandGroup heading="Team Members">
                  {filteredMembers.map((member, index) => (
                    <CommandItem
                      key={member.user_id}
                      ref={el => itemsRef.current[index] = el}
                      onSelect={() => onSelect(member.user_id, member.name || member.email || 'Unknown')}
                      className={selectedIndex === index ? 'bg-accent' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {(member.name || member.email || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {member.name || 'Unknown'}
                          </span>
                          {member.email && (
                            <span className="text-xs text-muted-foreground">
                              {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

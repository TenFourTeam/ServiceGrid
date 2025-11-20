import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { ChangelogEntry as ChangelogEntryType } from '@/hooks/useChangelogEntries';
import { useDeleteEntry } from '@/hooks/useChangelogEntries';
import { hasUserReacted, useAddReaction, useRemoveReaction } from '@/hooks/useChangelogReactions';
import { ReactionPicker } from './ReactionPicker';
import { EditEntryDialog } from './EditEntryDialog';
import { cn } from '@/lib/utils';

interface ChangelogEntryProps {
  entry: ChangelogEntryType;
  isLast?: boolean;
}

export function ChangelogEntry({ entry, isLast }: ChangelogEntryProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const deleteEntry = useDeleteEntry();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  const handleDelete = () => {
    deleteEntry.mutate(entry.id);
    setDeleteDialogOpen(false);
  };

  const handleReactionClick = (emoji: string) => {
    if (hasUserReacted(entry.id, emoji)) {
      removeReaction.mutate({ entryId: entry.id, emoji });
    } else {
      addReaction.mutate({ entryId: entry.id, emoji });
    }
  };

  const sortedReactions = Object.entries(entry.reaction_counts)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr] gap-6">
        {/* Date column */}
        <div className="text-sm text-muted-foreground pt-1">
          {format(new Date(entry.publish_date), 'd MMM, yyyy')}
        </div>

        {/* Content column */}
        <div className={cn(
          'space-y-4 pb-12',
          !isLast && 'border-l-2 border-border pl-6'
        )}>
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h2 className="text-2xl font-semibold">{entry.title}</h2>
                {entry.description && (
                  <p className="text-muted-foreground">{entry.description}</p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {entry.tag && (
              <Badge variant="secondary">{entry.tag}</Badge>
            )}
          </div>

          {/* Sections */}
          {entry.sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <span>{section.emoji}</span>
                <span>{section.title}</span>
              </h3>
              <ul className="space-y-1 ml-8">
                {section.items.map((item) => (
                  <li key={item.id} className="text-muted-foreground">
                    • {item.content}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Reactions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {sortedReactions.map(([emoji, count]) => (
              <Button
                key={emoji}
                variant={hasUserReacted(entry.id, emoji) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleReactionClick(emoji)}
                className="gap-1.5"
              >
                <span>{emoji}</span>
                <span className="text-xs">{count}</span>
              </Button>
            ))}
            <ReactionPicker onSelectReaction={(emoji) => handleReactionClick(emoji)} />
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete changelog entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this changelog entry and all its sections.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditEntryDialog
        entry={entry}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}

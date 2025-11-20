import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Bell } from 'lucide-react';
import { TopNav } from '@/landing/components/TopNav';
import { Footer } from '@/landing/components/Footer';
import { useChangelogEntries, useChangelogRealtime } from '@/hooks/useChangelogEntries';
import { ChangelogEntry } from '@/components/Changelog/ChangelogEntry';
import { AddEntryDialog } from '@/components/Changelog/AddEntryDialog';

export default function Changelog() {
  const [selectedSort, setSelectedSort] = useState<'newest' | 'oldest'>('newest');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: entries, isLoading } = useChangelogEntries({
    sortBy: selectedSort,
  });

  useChangelogRealtime();

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="space-y-4 mb-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold">Changelog</h1>
                <p className="text-muted-foreground mt-2">
                  Stay up to date with the latest features and improvements
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <Button variant="outline" className="gap-2">
                <Bell className="w-4 h-4" />
                Subscribe to updates
              </Button>

              <div className="flex gap-3">
                <Select value={selectedSort} onValueChange={(v: any) => setSelectedSort(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {isLoading ? (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-1 lg:grid-cols-[140px_1fr] gap-6">
                  <Skeleton className="h-6 w-32" />
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries && entries.length > 0 ? (
            <div className="space-y-0">
              {entries.map((entry, index) => (
                <ChangelogEntry
                  key={entry.id}
                  entry={entry}
                  isLast={index === entries.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4 text-lg">
                No updates yet. Be the first to share what's new!
              </p>
              <Button onClick={() => setAddDialogOpen(true)} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create First Entry
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <AddEntryDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
